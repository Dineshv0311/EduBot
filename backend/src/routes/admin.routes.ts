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

// ==========================================
// 6. CODING PROBLEM & TEST CASE CRUD
// ==========================================

// GET /api/admin/coding-problems — List all problems with test case & submission statistics
router.get('/coding-problems', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
         cp.problem_id, cp.title, cp.slug, cp.difficulty, cp.topic,
         cp.status, cp.time_limit_ms, cp.memory_limit_kb, cp.created_at, cp.updated_at,
         COUNT(DISTINCT tc.test_case_id)::int AS total_test_cases,
         COUNT(DISTINCT tc.test_case_id) FILTER (WHERE tc.is_sample = true)::int AS sample_test_cases,
         COUNT(DISTINCT tc.test_case_id) FILTER (WHERE tc.is_sample = false)::int AS hidden_test_cases,
         COUNT(DISTINCT cs.submission_id)::int AS total_submissions
       FROM coding_problem cp
       LEFT JOIN coding_test_case tc ON cp.problem_id = tc.problem_id
       LEFT JOIN coding_submission cs ON cp.problem_id = cs.problem_id
       GROUP BY cp.problem_id
       ORDER BY cp.problem_id DESC`
    );
    return res.json({ problems: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch coding problems: ' + err.message });
  }
});

// POST /api/admin/coding-problems — Create a new coding problem
router.post('/coding-problems', async (req: AuthRequest, res: Response) => {
  const {
    title,
    slug,
    description,
    difficulty = 'Medium',
    topic,
    input_format,
    output_format,
    constraints,
    example_input,
    example_output,
    example_explanation,
    starter_code,
    time_limit_ms = 3000,
    memory_limit_kb = 128000,
    status = 'Draft'
  } = req.body;

  const adminId = req.user?.user_id;

  if (!title || !description || !topic) {
    return res.status(400).json({ error: 'Title, description, and topic are required.' });
  }

  // Generate slug if not provided
  const generatedSlug = (slug || title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  try {
    const result = await pool.query(
      `INSERT INTO coding_problem (
        title, slug, description, difficulty, topic,
        input_format, output_format, constraints,
        example_input, example_output, example_explanation,
        starter_code, time_limit_ms, memory_limit_kb, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        title.trim(),
        generatedSlug,
        description.trim(),
        difficulty,
        topic.trim(),
        input_format || '',
        output_format || '',
        constraints || '',
        example_input || '',
        example_output || '',
        example_explanation || '',
        starter_code || { python: "import sys\n\ndef solve():\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    pass\n\nif __name__ == '__main__':\n    solve()\n" },
        time_limit_ms,
        memory_limit_kb,
        status,
        adminId
      ]
    );

    return res.status(201).json({ message: 'Problem created successfully', problem: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'A problem with this title or slug already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create problem: ' + err.message });
  }
});

// GET /api/admin/coding-problems/:id — Get problem details with all test cases
router.get('/coding-problems/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const problemRes = await pool.query('SELECT * FROM coding_problem WHERE problem_id = $1', [id]);
    if (problemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    const testCasesRes = await pool.query(
      'SELECT * FROM coding_test_case WHERE problem_id = $1 ORDER BY order_index ASC, test_case_id ASC',
      [id]
    );

    return res.json({
      problem: problemRes.rows[0],
      testCases: testCasesRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch problem: ' + err.message });
  }
});

// PUT /api/admin/coding-problems/:id — Update problem definition
router.put('/coding-problems/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    slug,
    description,
    difficulty,
    topic,
    input_format,
    output_format,
    constraints,
    example_input,
    example_output,
    example_explanation,
    starter_code,
    time_limit_ms,
    memory_limit_kb,
    status
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE coding_problem
       SET title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           description = COALESCE($3, description),
           difficulty = COALESCE($4, difficulty),
           topic = COALESCE($5, topic),
           input_format = COALESCE($6, input_format),
           output_format = COALESCE($7, output_format),
           constraints = COALESCE($8, constraints),
           example_input = COALESCE($9, example_input),
           example_output = COALESCE($10, example_output),
           example_explanation = COALESCE($11, example_explanation),
           starter_code = COALESCE($12, starter_code),
           time_limit_ms = COALESCE($13, time_limit_ms),
           memory_limit_kb = COALESCE($14, memory_limit_kb),
           status = COALESCE($15, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE problem_id = $16
       RETURNING *`,
      [
        title ? title.trim() : null,
        slug ? slug.trim() : null,
        description ? description.trim() : null,
        difficulty,
        topic ? topic.trim() : null,
        input_format,
        output_format,
        constraints,
        example_input,
        example_output,
        example_explanation,
        starter_code,
        time_limit_ms,
        memory_limit_kb,
        status,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    return res.json({ message: 'Problem updated successfully', problem: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update problem: ' + err.message });
  }
});

// DELETE /api/admin/coding-problems/:id — Delete problem
router.delete('/coding-problems/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM coding_problem WHERE problem_id = $1 RETURNING problem_id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }
    return res.json({ message: 'Problem deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete problem: ' + err.message });
  }
});

// PATCH /api/admin/coding-problems/:id/status — Toggle status between Draft and Published
router.patch('/coding-problems/:id/status', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Draft', 'Published', 'Archived'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Draft, Published, or Archived.' });
  }

  try {
    // If publishing, ensure there is at least one test case
    if (status === 'Published') {
      const tcCheck = await pool.query('SELECT COUNT(*) FROM coding_test_case WHERE problem_id = $1', [id]);
      if (parseInt(tcCheck.rows[0].count, 10) === 0) {
        return res.status(400).json({ error: 'Cannot publish a problem with 0 test cases. Please add test cases first.' });
      }
    }

    const result = await pool.query(
      'UPDATE coding_problem SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE problem_id = $2 RETURNING problem_id, status',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    return res.json({ message: `Problem status set to ${status}`, problem: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update problem status: ' + err.message });
  }
});

// GET /api/admin/coding-problems/:id/test-cases — List all test cases for problem
router.get('/coding-problems/:id/test-cases', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM coding_test_case WHERE problem_id = $1 ORDER BY order_index ASC, test_case_id ASC',
      [id]
    );
    return res.json({ testCases: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch test cases: ' + err.message });
  }
});

// POST /api/admin/coding-problems/:id/test-cases — Add a test case
router.post('/coding-problems/:id/test-cases', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { input, expected_output, is_sample = false, description = '', order_index = 0 } = req.body;

  if (input === undefined || expected_output === undefined) {
    return res.status(400).json({ error: 'Input and expected_output are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO coding_test_case (problem_id, input, expected_output, is_sample, description, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, String(input), String(expected_output), Boolean(is_sample), description, order_index]
    );
    return res.status(201).json({ message: 'Test case added', testCase: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create test case: ' + err.message });
  }
});

// PUT /api/admin/coding-test-cases/:testCaseId — Update test case
router.put('/coding-test-cases/:testCaseId', async (req: AuthRequest, res: Response) => {
  const { testCaseId } = req.params;
  const { input, expected_output, is_sample, description, order_index } = req.body;

  try {
    const result = await pool.query(
      `UPDATE coding_test_case
       SET input = COALESCE($1, input),
           expected_output = COALESCE($2, expected_output),
           is_sample = COALESCE($3, is_sample),
           description = COALESCE($4, description),
           order_index = COALESCE($5, order_index)
       WHERE test_case_id = $6
       RETURNING *`,
      [input, expected_output, is_sample, description, order_index, testCaseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found.' });
    }

    return res.json({ message: 'Test case updated', testCase: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update test case: ' + err.message });
  }
});

// DELETE /api/admin/coding-test-cases/:testCaseId — Delete test case
router.delete('/coding-test-cases/:testCaseId', async (req: AuthRequest, res: Response) => {
  const { testCaseId } = req.params;
  try {
    const result = await pool.query('DELETE FROM coding_test_case WHERE test_case_id = $1 RETURNING test_case_id', [testCaseId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Test case not found.' });
    }
    return res.json({ message: 'Test case deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete test case: ' + err.message });
  }
});

export default router;