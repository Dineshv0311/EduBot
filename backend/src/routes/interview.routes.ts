import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Helper to seed sample companies & interview questions if empty
const seedSampleInterviewData = async () => {
  const countRes = await pool.query('SELECT COUNT(*) FROM company');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    const comp1 = await pool.query(
      `INSERT INTO company (company_name, industry, description, website)
       VALUES ('TechCorp Labs', 'Software & Cloud Services', 'Global cloud enterprise platform.', 'https://techcorp.example.com')
       RETURNING company_id`
    );
    const comp2 = await pool.query(
      `INSERT INTO company (company_name, industry, description, website)
       VALUES ('FinTech Solutions', 'Financial Technology', 'High-frequency trading and banking APIs.', 'https://fintech.example.com')
       RETURNING company_id`
    );

    const c1Id = comp1.rows[0].company_id;
    const c2Id = comp2.rows[0].company_id;

    await pool.query(
      `INSERT INTO interview_question (company_id, question_text, category, difficulty) VALUES
       ($1, 'Explain how indexing improves SQL query performance and the trade-offs involved.', 'Database', 'Medium'),
       ($1, 'What is the Event Loop in Node.js and how does it handle asynchronous operations?', 'Backend', 'Medium'),
       ($1, 'Describe a challenging architectural bug you resolved and your debugging methodology.', 'Behavioral', 'Hard'),
       ($2, 'How do you ensure data consistency across distributed microservices?', 'System Design', 'Hard'),
       ($2, 'Explain the difference between optimistic and pessimistic database concurrency locking.', 'Database', 'Medium')`,
      [c1Id, c2Id]
    );
  }
};

// GET /api/mock-interview/companies — List companies with question counts
router.get('/companies', async (_req: AuthRequest, res: Response) => {
  try {
    await seedSampleInterviewData();
    const result = await pool.query(
      `SELECT c.company_id, c.company_name, c.industry, c.description, c.website,
              COUNT(q.question_id)::int AS question_count
       FROM company c
       LEFT JOIN interview_question q ON c.company_id = q.company_id
       GROUP BY c.company_id
       ORDER BY c.company_name ASC`
    );
    return res.json({ companies: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch companies: ' + err.message });
  }
});

// GET /api/mock-interview/questions/:companyId — Fetch questions for interview
router.get('/questions/:companyId', async (req: AuthRequest, res: Response) => {
  const { companyId } = req.params;
  try {
    const result = await pool.query(
      `SELECT question_id, company_id, question_text, category, difficulty
       FROM interview_question
       WHERE company_id = $1
       ORDER BY question_id ASC`,
      [companyId]
    );
    return res.json({ questions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch questions: ' + err.message });
  }
});

// POST /api/mock-interview/attempt/start — Start new mock interview session
router.post('/attempt/start', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { company_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO mock_interview_attempt (user_id, company_id, started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING attempt_id, user_id, company_id, started_at`,
      [userId, company_id || null]
    );
    return res.status(201).json({ attempt: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to start interview attempt: ' + err.message });
  }
});

// POST /api/mock-interview/attempt/:attemptId/submit — Submit answers and evaluate
router.post('/attempt/:attemptId/submit', async (req: AuthRequest, res: Response) => {
  const { attemptId } = req.params;
  const { responses } = req.body; // Array of { question_id: number, answer_text: string }

  if (!Array.isArray(responses) || responses.length === 0) {
    return res.status(400).json({ error: 'Responses array is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let totalScore = 0;

    for (const r of responses) {
      const answer = (r.answer_text || '').trim();
      // Heuristic scoring based on response depth and substance (max 100 per question)
      let questionScore = 0;
      if (answer.length > 200) questionScore = 90;
      else if (answer.length > 100) questionScore = 75;
      else if (answer.length > 40) questionScore = 60;
      else if (answer.length > 10) questionScore = 40;
      else questionScore = 15;

      totalScore += questionScore;

      await client.query(
        `INSERT INTO interview_response (attempt_id, question_id, answer_text, score)
         VALUES ($1, $2, $3, $4)`,
        [attemptId, r.question_id, answer, questionScore]
      );
    }

    const averageScore = Math.round((totalScore / responses.length) * 100) / 100;

    await client.query(
      `UPDATE mock_interview_attempt
       SET completed_at = CURRENT_TIMESTAMP, total_score = $1
       WHERE attempt_id = $2`,
      [averageScore, attemptId]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Interview responses evaluated successfully',
      attempt_id: parseInt(attemptId, 10),
      total_score: averageScore
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to evaluate interview: ' + err.message });
  } finally {
    client.release();
  }
});

// GET /api/mock-interview/history — Student attempt history
router.get('/history', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  try {
    const result = await pool.query(
      `SELECT a.attempt_id, a.started_at, a.completed_at, a.total_score,
              c.company_name
       FROM mock_interview_attempt a
       LEFT JOIN company c ON a.company_id = c.company_id
       WHERE a.user_id = $1 AND a.completed_at IS NOT NULL
       ORDER BY a.completed_at DESC`,
      [userId]
    );
    return res.json({ history: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch interview history: ' + err.message });
  }
});

export default router;