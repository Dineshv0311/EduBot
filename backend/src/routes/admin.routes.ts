import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Strict Gate: Both authentication and Admin role required for all routes
router.use(requireAuth);
router.use(requireAdmin);

// ==========================================
// 1. COMPANY CRUD
// ==========================================

// GET /api/admin/companies — List all companies with metadata
router.get('/companies', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.company_id, c.company_name, c.industry, c.description, c.website,
              COUNT(DISTINCT q.question_id)::int AS question_count,
              COUNT(DISTINCT cc.content_id)::int AS content_count
       FROM company c
       LEFT JOIN interview_question q ON c.company_id = q.company_id
       LEFT JOIN company_content cc ON c.company_id = cc.company_id
       GROUP BY c.company_id
       ORDER BY c.company_id DESC`
    );
    return res.json({ companies: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch companies: ' + err.message });
  }
});

// POST /api/admin/companies — Create company
router.post('/companies', async (req: AuthRequest, res: Response) => {
  const { company_name, industry, description, website } = req.body;

  if (!company_name || !industry) {
    return res.status(400).json({ error: 'Company name and industry are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO company (company_name, industry, description, website)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [company_name.trim(), industry.trim(), description || '', website || '']
    );
    return res.status(201).json({ message: 'Company created', company: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create company: ' + err.message });
  }
});

// DELETE /api/admin/companies/:id — Delete company
router.delete('/companies/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM company WHERE company_id = $1 RETURNING company_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Company not found.' });
    }
    return res.json({ message: 'Company deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete company: ' + err.message });
  }
});

// ==========================================
// 2. COMPANY CONTENT CRUD
// ==========================================

// GET /api/admin/content/:companyId — Fetch content for a company
router.get('/content/:companyId', async (req: AuthRequest, res: Response) => {
  const { companyId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM company_content WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    return res.json({ content: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch content: ' + err.message });
  }
});

// POST /api/admin/content — Add content for a company
router.post('/content', async (req: AuthRequest, res: Response) => {
  const { company_id, title, content_type, description, resource_url } = req.body;

  if (!company_id || !title || !content_type) {
    return res.status(400).json({ error: 'company_id, title, and content_type are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO company_content (company_id, title, content_type, description, resource_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [company_id, title.trim(), content_type.trim(), description || '', resource_url || '']
    );
    return res.status(201).json({ message: 'Content created', content: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create content: ' + err.message });
  }
});

// DELETE /api/admin/content/:id — Delete content
router.delete('/content/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM company_content WHERE content_id = $1 RETURNING content_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Content not found.' });
    }
    return res.json({ message: 'Content deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete content: ' + err.message });
  }
});

// ==========================================
// 3. INTERVIEW QUESTIONS CRUD
// ==========================================

// GET /api/admin/interview-questions — List all interview questions
router.get('/interview-questions', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT q.question_id, q.company_id, q.question_text, q.category, q.difficulty,
              c.company_name
       FROM interview_question q
       LEFT JOIN company c ON q.company_id = c.company_id
       ORDER BY q.question_id DESC`
    );
    return res.json({ questions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch interview questions: ' + err.message });
  }
});

// POST /api/admin/interview-questions — Create interview question
router.post('/interview-questions', async (req: AuthRequest, res: Response) => {
  const { company_id, question_text, category, difficulty } = req.body;

  if (!question_text || !category) {
    return res.status(400).json({ error: 'question_text and category are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO interview_question (company_id, question_text, category, difficulty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [company_id || null, question_text.trim(), category.trim(), difficulty || 'Medium']
    );
    return res.status(201).json({ message: 'Interview question created', question: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create question: ' + err.message });
  }
});

// DELETE /api/admin/interview-questions/:id — Delete interview question
router.delete('/interview-questions/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM interview_question WHERE question_id = $1 RETURNING question_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    return res.json({ message: 'Interview question deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete question: ' + err.message });
  }
});

// ==========================================
// 4. APTITUDE TESTS & QUESTIONS CRUD
// ==========================================

// GET /api/admin/aptitude-tests — List all tests with question counts
router.get('/aptitude-tests', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT t.test_id, t.title, t.description, t.duration_minutes, t.difficulty,
              COUNT(q.question_id)::int AS total_questions,
              COALESCE(SUM(q.marks), 0)::int AS total_marks
       FROM aptitude_test t
       LEFT JOIN aptitude_question q ON t.test_id = q.test_id
       GROUP BY t.test_id
       ORDER BY t.test_id DESC`
    );
    return res.json({ tests: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tests: ' + err.message });
  }
});

// POST /api/admin/aptitude-tests — Create aptitude test
router.post('/aptitude-tests', async (req: AuthRequest, res: Response) => {
  const { title, description, duration_minutes, difficulty } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Test title is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO aptitude_test (title, description, duration_minutes, difficulty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title.trim(), description || '', duration_minutes || 15, difficulty || 'Medium']
    );
    return res.status(201).json({ message: 'Test created', test: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create test: ' + err.message });
  }
});

// DELETE /api/admin/aptitude-tests/:id — Delete aptitude test
router.delete('/aptitude-tests/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM aptitude_test WHERE test_id = $1 RETURNING test_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found.' });
    }
    return res.json({ message: 'Test deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete test: ' + err.message });
  }
});

// GET /api/admin/aptitude-questions/:testId — Get questions for a test (includes correct_option for admin)
router.get('/aptitude-questions/:testId', async (req: AuthRequest, res: Response) => {
  const { testId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM aptitude_question WHERE test_id = $1 ORDER BY question_id ASC',
      [testId]
    );
    return res.json({ questions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch questions: ' + err.message });
  }
});

// POST /api/admin/aptitude-questions — Create question for test
router.post('/aptitude-questions', async (req: AuthRequest, res: Response) => {
  const { test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks } = req.body;

  if (!test_id || !question_text || !option_a || !option_b || !option_c || !option_d || !correct_option) {
    return res.status(400).json({ error: 'All question fields and correct_option (A/B/C/D) are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO aptitude_question (test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [test_id, question_text.trim(), option_a.trim(), option_b.trim(), option_c.trim(), option_d.trim(), correct_option, marks || 1]
    );
    return res.status(201).json({ message: 'Question added', question: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create aptitude question: ' + err.message });
  }
});

// DELETE /api/admin/aptitude-questions/:id — Delete aptitude question
router.delete('/aptitude-questions/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM aptitude_question WHERE question_id = $1 RETURNING question_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    return res.json({ message: 'Question deleted' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete question: ' + err.message });
  }
});

export default router;