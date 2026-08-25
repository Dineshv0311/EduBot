import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Helper to seed sample aptitude tests and questions if empty
const seedSampleAptitudeData = async () => {
  const countRes = await pool.query('SELECT COUNT(*) FROM aptitude_test');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    const t1 = await pool.query(
      `INSERT INTO aptitude_test (title, description, duration_minutes, difficulty)
       VALUES ('Quantitative Aptitude & Logic (Speed Test)', 'Core placement math, permutations, speed-distance & logical sequences.', 2, 'Medium')
       RETURNING test_id`
    );
    const testId = t1.rows[0].test_id;

    await pool.query(
      `INSERT INTO aptitude_question (test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks) VALUES
       ($1, 'A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?', '120 metres', '180 metres', '324 metres', '150 metres', 'D', 2),
       ($1, 'Find the missing number in the sequence: 4, 9, 25, 49, 121, ___', '169', '144', '196', '225', 'A', 2),
       ($1, 'If a person sells an article for $650 at a profit of 30%, what was the cost price?', '$500', '$480', '$520', '$450', 'A', 2),
       ($1, 'A and B together can complete a work in 12 days. A alone can do it in 20 days. In how many days can B alone complete it?', '25 days', '30 days', '35 days', '28 days', 'B', 2)`,
      [testId]
    );
  }
};

// GET /api/aptitude/tests — Get available tests
router.get('/tests', async (_req: AuthRequest, res: Response) => {
  try {
    await seedSampleAptitudeData();
    const result = await pool.query(
      `SELECT t.test_id, t.title, t.description, t.duration_minutes, t.difficulty,
              COUNT(q.question_id)::int AS total_questions,
              COALESCE(SUM(q.marks), 0)::int AS total_marks
       FROM aptitude_test t
       LEFT JOIN aptitude_question q ON t.test_id = q.test_id
       GROUP BY t.test_id
       ORDER BY t.test_id ASC`
    );
    return res.json({ tests: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch aptitude tests: ' + err.message });
  }
});

// GET /api/aptitude/test/:testId — Get test questions (excludes correct_option for integrity)
router.get('/test/:testId', async (req: AuthRequest, res: Response) => {
  const { testId } = req.params;
  try {
    const testRes = await pool.query('SELECT * FROM aptitude_test WHERE test_id = $1', [testId]);
    if (testRes.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    const qRes = await pool.query(
      `SELECT question_id, test_id, question_text, option_a, option_b, option_c, option_d, marks
       FROM aptitude_question
       WHERE test_id = $1
       ORDER BY question_id ASC`,
      [testId]
    );

    return res.json({
      test: testRes.rows[0],
      questions: qRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch test details: ' + err.message });
  }
});

// POST /api/aptitude/attempt/start — Start test attempt
router.post('/attempt/start', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { test_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO aptitude_attempt (user_id, test_id, started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING attempt_id, user_id, test_id, started_at`,
      [userId, test_id]
    );
    return res.status(201).json({ attempt: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to start aptitude attempt: ' + err.message });
  }
});

// POST /api/aptitude/attempt/:attemptId/submit — Submit answers, grade & score
router.post('/attempt/:attemptId/submit', async (req: AuthRequest, res: Response) => {
  const { attemptId } = req.params;
  const { answers } = req.body; // Map or array of { question_id: number, selected_option: string }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const attemptRes = await client.query(
      'SELECT attempt_id, test_id FROM aptitude_attempt WHERE attempt_id = $1',
      [attemptId]
    );
    if (attemptRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Attempt not found.' });
    }

    const testId = attemptRes.rows[0].test_id;

    // Fetch official answer key
    const questionsRes = await client.query(
      'SELECT question_id, correct_option, marks FROM aptitude_question WHERE test_id = $1',
      [testId]
    );

    const questionMap = new Map();
    let maxPossibleScore = 0;
    questionsRes.rows.forEach((q) => {
      questionMap.set(q.question_id, q);
      maxPossibleScore += q.marks;
    });

    let totalMarksObtained = 0;
    const answerBreakdown: any[] = [];

    for (const ans of (answers || [])) {
      const q = questionMap.get(ans.question_id);
      if (q) {
        const isCorrect = ans.selected_option === q.correct_option;
        const marksObtained = isCorrect ? q.marks : 0;
        totalMarksObtained += marksObtained;

        await client.query(
          `INSERT INTO aptitude_answer (attempt_id, question_id, selected_option, is_correct, marks_obtained)
           VALUES ($1, $2, $3, $4, $5)`,
          [attemptId, ans.question_id, ans.selected_option || null, isCorrect, marksObtained]
        );

        answerBreakdown.push({
          question_id: ans.question_id,
          selected_option: ans.selected_option,
          correct_option: q.correct_option,
          is_correct: isCorrect,
          marks_obtained: marksObtained
        });
      }
    }

    const percentageScore = maxPossibleScore > 0
      ? Math.round((totalMarksObtained / maxPossibleScore) * 100 * 100) / 100
      : 0;

    await client.query(
      `UPDATE aptitude_attempt
       SET completed_at = CURRENT_TIMESTAMP, score = $1
       WHERE attempt_id = $2`,
      [percentageScore, attemptId]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Aptitude test evaluated',
      total_marks_obtained: totalMarksObtained,
      max_marks: maxPossibleScore,
      score_percentage: percentageScore,
      breakdown: answerBreakdown
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to grade aptitude test: ' + err.message });
  } finally {
    client.release();
  }
});

// GET /api/aptitude/history — Student attempt history
router.get('/history', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  try {
    const result = await pool.query(
      `SELECT a.attempt_id, a.started_at, a.completed_at, a.score,
              t.title AS test_title, t.difficulty
       FROM aptitude_attempt a
       LEFT JOIN aptitude_test t ON a.test_id = t.test_id
       WHERE a.user_id = $1 AND a.completed_at IS NOT NULL
       ORDER BY a.completed_at DESC`,
      [userId]
    );
    return res.json({ history: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch aptitude history: ' + err.message });
  }
});

export default router;