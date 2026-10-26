import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { evaluateTestCases, executeCode, normalizeOutput } from '../services/codeExecution.service.js';

const router = Router();
router.use(requireAuth);

// GET /api/coding-problems — List all published problems with user's solved status
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { topic, difficulty, search } = req.query;

  try {
    let query = `
      SELECT 
        cp.problem_id,
        cp.title,
        cp.slug,
        cp.difficulty,
        cp.topic,
        cp.status,
        cp.created_at,
        COUNT(tc.test_case_id)::int AS total_test_cases,
        COUNT(tc.test_case_id) FILTER (WHERE tc.is_sample = true)::int AS sample_test_cases,
        EXISTS (
          SELECT 1 FROM coding_activity ca 
          WHERE ca.user_id = $1 
            AND ca.problem_name = cp.title 
            AND ca.completion_status = 'Correct'
        ) AS is_solved,
        (
          SELECT cs.verdict 
          FROM coding_submission cs 
          WHERE cs.user_id = $1 AND cs.problem_id = cp.problem_id 
          ORDER BY cs.submitted_at DESC 
          LIMIT 1
        ) AS latest_verdict
      FROM coding_problem cp
      LEFT JOIN coding_test_case tc ON cp.problem_id = tc.problem_id
      WHERE cp.status = 'Published'
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (topic && typeof topic === 'string' && topic !== 'All') {
      query += ` AND cp.topic = $${paramIndex++}`;
      params.push(topic);
    }

    if (difficulty && typeof difficulty === 'string' && difficulty !== 'All') {
      query += ` AND cp.difficulty = $${paramIndex++}`;
      params.push(difficulty);
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      query += ` AND (cp.title ILIKE $${paramIndex} OR cp.description ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += `
      GROUP BY cp.problem_id
      ORDER BY cp.problem_id ASC
    `;

    const result = await pool.query(query, params);
    return res.json({ problems: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch coding problems: ' + err.message });
  }
});

// GET /api/coding-problems/stats/user — Summary metrics for coding problems
router.get('/stats/user', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const totalProblemsRes = await pool.query(
      `SELECT COUNT(*)::int AS total_published FROM coding_problem WHERE status = 'Published'`
    );

    const userSolvedRes = await pool.query(
      `SELECT 
         COUNT(DISTINCT cp.problem_id)::int AS solved_count,
         COUNT(DISTINCT cp.problem_id) FILTER (WHERE cp.difficulty = 'Easy')::int AS easy_solved,
         COUNT(DISTINCT cp.problem_id) FILTER (WHERE cp.difficulty = 'Medium')::int AS medium_solved,
         COUNT(DISTINCT cp.problem_id) FILTER (WHERE cp.difficulty = 'Hard')::int AS hard_solved
       FROM coding_problem cp
       INNER JOIN coding_activity ca ON ca.problem_name = cp.title AND ca.completion_status = 'Correct'
       WHERE ca.user_id = $1 AND cp.status = 'Published'`,
      [userId]
    );

    const userSubsRes = await pool.query(
      `SELECT COUNT(*)::int AS total_submissions,
              COUNT(*) FILTER (WHERE verdict = 'Accepted')::int AS accepted_submissions
       FROM coding_submission
       WHERE user_id = $1`,
      [userId]
    );

    return res.json({
      totalPublished: totalProblemsRes.rows[0]?.total_published || 0,
      solved: userSolvedRes.rows[0] || { solved_count: 0, easy_solved: 0, medium_solved: 0, hard_solved: 0 },
      submissions: userSubsRes.rows[0] || { total_submissions: 0, accepted_submissions: 0 }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user stats: ' + err.message });
  }
});

// GET /api/coding-problems/:idOrSlug — Problem details for student IDE (SAMPLE CASES ONLY)
router.get('/:idOrSlug', async (req: AuthRequest, res: Response) => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);

  try {
    const problemRes = await pool.query(
      `SELECT 
        problem_id, title, slug, description, difficulty, topic,
        input_format, output_format, constraints,
        example_input, example_output, example_explanation,
        supported_languages, starter_code, time_limit_ms, memory_limit_kb,
        status, created_at
      FROM coding_problem
      WHERE (problem_id = $1 OR slug = $2) AND status = 'Published'`,
      [isNumeric ? parseInt(idOrSlug, 10) : -1, idOrSlug]
    );

    if (problemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Coding problem not found or not published.' });
    }

    const problem = problemRes.rows[0];

    // Fetch ONLY sample test cases for students. Hidden test cases are strictly excluded!
    const testCasesRes = await pool.query(
      `SELECT test_case_id, input, expected_output, is_sample, description, order_index
       FROM coding_test_case
       WHERE problem_id = $1 AND is_sample = true
       ORDER BY order_index ASC, test_case_id ASC`,
      [problem.problem_id]
    );

    return res.json({
      problem,
      sampleTestCases: testCasesRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch problem details: ' + err.message });
  }
});

// POST /api/coding-problems/:id/run — Test code against sample test cases (Does NOT mark solved)
router.post('/:id/run', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { source_code, language = 'python', custom_input } = req.body;

  if (!source_code || typeof source_code !== 'string' || source_code.trim().length === 0) {
    return res.status(400).json({ error: 'Source code is required.' });
  }

  try {
    const problemRes = await pool.query(
      'SELECT problem_id, title, time_limit_ms, status FROM coding_problem WHERE problem_id = $1',
      [id]
    );

    if (problemRes.rows.length === 0 || problemRes.rows[0].status !== 'Published') {
      return res.status(404).json({ error: 'Problem not found or not published.' });
    }

    const problem = problemRes.rows[0];
    const timeLimitMs = problem.time_limit_ms || 3000;

    // If student provided custom input to test ad-hoc
    if (custom_input !== undefined && custom_input !== null) {
      const execResult = await executeCode(source_code, String(custom_input), language, timeLimitMs);
      return res.json({
        type: 'custom',
        stdout: execResult.stdout,
        stderr: execResult.stderr,
        status: execResult.status,
        executionTime: execResult.executionTime,
        memoryUsed: execResult.memoryUsed
      });
    }

    // Run against sample test cases
    const samplesRes = await pool.query(
      `SELECT test_case_id, input, expected_output, is_sample
       FROM coding_test_case
       WHERE problem_id = $1 AND is_sample = true
       ORDER BY order_index ASC, test_case_id ASC`,
      [id]
    );

    const testCases = samplesRes.rows;
    if (testCases.length === 0) {
      return res.status(400).json({ error: 'No sample test cases configured for this problem.' });
    }

    const evaluation = await evaluateTestCases(source_code, testCases, language, timeLimitMs, true);

    return res.json({
      type: 'sample_run',
      verdict: evaluation.overallVerdict,
      passedCount: evaluation.passedCount,
      totalCount: evaluation.totalCount,
      totalTime: evaluation.totalTime,
      evaluations: evaluation.evaluations
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to run code: ' + err.message });
  }
});

// POST /api/coding-problems/:id/submit — Full evaluation against ALL test cases (Sample + Hidden)
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  const { source_code, language = 'python' } = req.body;

  if (!source_code || typeof source_code !== 'string' || source_code.trim().length === 0) {
    return res.status(400).json({ error: 'Source code is required.' });
  }

  const client = await pool.connect();
  try {
    const problemRes = await client.query(
      'SELECT problem_id, title, topic, difficulty, time_limit_ms, status FROM coding_problem WHERE problem_id = $1',
      [id]
    );

    if (problemRes.rows.length === 0 || problemRes.rows[0].status !== 'Published') {
      return res.status(404).json({ error: 'Problem not found or not published.' });
    }

    const problem = problemRes.rows[0];
    const timeLimitMs = problem.time_limit_ms || 3000;

    // Fetch ALL test cases (sample and hidden)
    const allCasesRes = await client.query(
      `SELECT test_case_id, input, expected_output, is_sample
       FROM coding_test_case
       WHERE problem_id = $1
       ORDER BY order_index ASC, test_case_id ASC`,
      [id]
    );

    const allCases = allCasesRes.rows;
    if (allCases.length === 0) {
      return res.status(400).json({ error: 'No test cases configured for this problem.' });
    }

    // Evaluate code against all cases (isAdmin is false for student)
    const evaluation = await evaluateTestCases(source_code, allCases, language, timeLimitMs, false);

    await client.query('BEGIN');

    // Insert submission record
    const subRes = await client.query(
      `INSERT INTO coding_submission (
        user_id, problem_id, source_code, language, verdict,
        passed_count, total_count, execution_time, memory_used, error_message, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING submission_id, user_id, problem_id, verdict, passed_count, total_count, execution_time, submitted_at`,
      [
        userId,
        problem.problem_id,
        source_code,
        language,
        evaluation.overallVerdict,
        evaluation.passedCount,
        evaluation.totalCount,
        evaluation.totalTime,
        evaluation.maxMemory,
        evaluation.overallVerdict !== 'Accepted' ? evaluation.evaluations.find(e => e.status !== 'Passed')?.errorMessage || null : null
      ]
    );
    const submissionId = subRes.rows[0].submission_id;

    // Insert per-case results
    for (const ev of evaluation.evaluations) {
      await client.query(
        `INSERT INTO coding_submission_case (
          submission_id, test_case_id, status, actual_output, execution_time, memory_used, error_output
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          submissionId,
          ev.testCaseId,
          ev.status,
          ev.isSample ? ev.actualOutput || '' : null, // Never leak hidden test case output
          ev.executionTime,
          ev.memoryUsed,
          ev.isSample ? ev.errorMessage || null : null
        ]
      );
    }

    // Connect with existing Coding Tracker:
    // If Accepted, record in coding_activity if not already solved (preventing inflation of solved count)
    let isFirstTimeSolved = false;
    if (evaluation.overallVerdict === 'Accepted') {
      const existingActivityRes = await client.query(
        `SELECT activity_id FROM coding_activity 
         WHERE user_id = $1 AND problem_name = $2 AND completion_status = 'Correct'`,
        [userId, problem.title]
      );

      if (existingActivityRes.rows.length === 0) {
        isFirstTimeSolved = true;
        await client.query(
          `INSERT INTO coding_activity (user_id, problem_name, topic, completion_status, activity_date)
           VALUES ($1, $2, $3, 'Correct', CURRENT_TIMESTAMP)`,
          [userId, problem.title, problem.topic]
        );
      } else {
        // Update existing activity timestamp to keep streak fresh without duplicating problem count
        await client.query(
          `UPDATE coding_activity SET activity_date = CURRENT_TIMESTAMP WHERE activity_id = $1`,
          [existingActivityRes.rows[0].activity_id]
        );
      }
    } else {
      // If not accepted, check if student already has a record for this problem
      const existingActivityRes = await client.query(
        `SELECT activity_id, completion_status FROM coding_activity 
         WHERE user_id = $1 AND problem_name = $2`,
        [userId, problem.title]
      );

      // If no record exists at all, record 'In Progress' or 'Incorrect'
      if (existingActivityRes.rows.length === 0) {
        await client.query(
          `INSERT INTO coding_activity (user_id, problem_name, topic, completion_status, activity_date)
           VALUES ($1, $2, $3, 'In Progress', CURRENT_TIMESTAMP)`,
          [userId, problem.title, problem.topic]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      submissionId,
      verdict: evaluation.overallVerdict,
      passedCount: evaluation.passedCount,
      totalCount: evaluation.totalCount,
      totalTime: evaluation.totalTime,
      isFirstTimeSolved,
      evaluations: evaluation.evaluations
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to process submission: ' + err.message });
  } finally {
    client.release();
  }
});

// GET /api/coding-problems/:id/submissions — Student's submission history for this problem
router.get('/:id/submissions', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.user_id;

  try {
    const result = await pool.query(
      `SELECT 
        submission_id, problem_id, language, verdict,
        passed_count, total_count, execution_time, memory_used,
        submitted_at
      FROM coding_submission
      WHERE user_id = $1 AND problem_id = $2
      ORDER BY submitted_at DESC
      LIMIT 20`,
      [userId, id]
    );

    return res.json({ submissions: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch submission history: ' + err.message });
  }
});

export default router;
