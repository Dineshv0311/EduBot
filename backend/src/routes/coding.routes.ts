import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all coding tracker routes
router.use(requireAuth);

// POST /api/coding-activity — Log a new coding practice problem
router.post('/', async (req: AuthRequest, res: Response) => {
  const { problem_name, topic, completion_status } = req.body;
  const userId = req.user?.user_id;

  if (!problem_name || !topic || !completion_status) {
    return res.status(400).json({ error: 'problem_name, topic, and completion_status are required.' });
  }

  const validStatuses = ['Correct', 'Incorrect', 'In Progress'];
  if (!validStatuses.includes(completion_status)) {
    return res.status(400).json({ error: 'completion_status must be Correct, Incorrect, or In Progress.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO coding_activity (user_id, problem_name, topic, completion_status, activity_date)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING activity_id, user_id, problem_name, topic, completion_status, activity_date`,
      [userId, problem_name.trim(), topic.trim(), completion_status]
    );

    return res.status(201).json({
      message: 'Coding activity logged successfully',
      activity: result.rows[0]
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to log coding activity: ' + err.message });
  }
});

// GET /api/coding-activity — Get all logged activities for current user
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const result = await pool.query(
      `SELECT activity_id, problem_name, topic, completion_status, activity_date
       FROM coding_activity
       WHERE user_id = $1
       ORDER BY activity_date DESC`,
      [userId]
    );

    return res.json({ activities: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch activities: ' + err.message });
  }
});

// GET /api/coding-activity/stats — Get streak, counts, and topic-wise breakdown
router.get('/stats', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    // 1. Topic breakdown
    const topicResult = await pool.query(
      `SELECT 
         topic,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE completion_status = 'Correct') AS correct_count,
         COUNT(*) FILTER (WHERE completion_status = 'Incorrect') AS incorrect_count,
         COUNT(*) FILTER (WHERE completion_status = 'In Progress') AS in_progress_count
       FROM coding_activity
       WHERE user_id = $1
       GROUP BY topic
       ORDER BY total DESC`,
      [userId]
    );

    // 2. Total aggregates
    const totalsResult = await pool.query(
      `SELECT 
         COUNT(*) AS total_solved,
         COUNT(*) FILTER (WHERE completion_status = 'Correct') AS total_correct,
         COUNT(*) FILTER (WHERE completion_status = 'Incorrect') AS total_incorrect
       FROM coding_activity
       WHERE user_id = $1`,
      [userId]
    );

    // 3. Consecutive Day Streak Calculation
    const datesResult = await pool.query(
      `SELECT DISTINCT DATE(activity_date) AS activity_day
       FROM coding_activity
       WHERE user_id = $1
       ORDER BY activity_day DESC`,
      [userId]
    );

    let streak = 0;
    if (datesResult.rows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const latestActivity = new Date(datesResult.rows[0].activity_day);
      latestActivity.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((today.getTime() - latestActivity.getTime()) / (1000 * 60 * 60 * 24));

      // Streak is active if the last activity was today (0) or yesterday (1)
      if (diffDays <= 1) {
        let expectedDate = new Date(latestActivity);
        for (const row of datesResult.rows) {
          const rowDate = new Date(row.activity_day);
          rowDate.setHours(0, 0, 0, 0);

          if (rowDate.getTime() === expectedDate.getTime()) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return res.json({
      streak,
      totals: totalsResult.rows[0],
      topicSummary: topicResult.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch coding stats: ' + err.message });
  }
});

export default router;