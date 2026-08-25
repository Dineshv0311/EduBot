import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/resume — Fetch complete resume (summary, projects, skills)
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    // 1. Get or create base resume row
    let resumeRes = await pool.query(
      'SELECT resume_id, user_id, summary, created_at, updated_at FROM resume WHERE user_id = $1',
      [userId]
    );

    if (resumeRes.rows.length === 0) {
      resumeRes = await pool.query(
        'INSERT INTO resume (user_id, summary) VALUES ($1, $2) RETURNING *',
        [userId, '']
      );
    }

    const resume = resumeRes.rows[0];

    // 2. Get associated projects
    const projectsRes = await pool.query(
      'SELECT project_id, resume_id, project_name, description, technologies, project_url FROM resume_project WHERE resume_id = $1 ORDER BY project_id ASC',
      [resume.resume_id]
    );

    // 3. Get associated skills
    const skillsRes = await pool.query(
      'SELECT skill_id, resume_id, skill_name, skill_category FROM resume_skill WHERE resume_id = $1 ORDER BY skill_id ASC',
      [resume.resume_id]
    );

    return res.json({
      resume: {
        ...resume,
        projects: projectsRes.rows,
        skills: skillsRes.rows
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch resume: ' + err.message });
  }
});

// PUT /api/resume — Full update of resume, projects, and skills
router.put('/', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { summary, projects, skills } = req.body;

  if (typeof summary !== 'string') {
    return res.status(400).json({ error: 'Summary must be a string.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure resume exists and update summary
    let resumeRes = await client.query(
      `INSERT INTO resume (user_id, summary, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET summary = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING resume_id, user_id, summary, updated_at`,
      [userId, summary]
    );

    const resumeId = resumeRes.rows[0].resume_id;

    // 2. Replace projects
    await client.query('DELETE FROM resume_project WHERE resume_id = $1', [resumeId]);
    if (Array.isArray(projects) && projects.length > 0) {
      for (const p of projects) {
        if (p.project_name && p.project_name.trim() !== '') {
          await client.query(
            `INSERT INTO resume_project (resume_id, project_name, description, technologies, project_url)
             VALUES ($1, $2, $3, $4, $5)`,
            [resumeId, p.project_name.trim(), p.description || '', p.technologies || '', p.project_url || '']
          );
        }
      }
    }

    // 3. Replace skills
    await client.query('DELETE FROM resume_skill WHERE resume_id = $1', [resumeId]);
    if (Array.isArray(skills) && skills.length > 0) {
      for (const s of skills) {
        if (s.skill_name && s.skill_name.trim() !== '') {
          await client.query(
            `INSERT INTO resume_skill (resume_id, skill_name, skill_category)
             VALUES ($1, $2, $3)`,
            [resumeId, s.skill_name.trim(), s.skill_category?.trim() || 'General']
          );
        }
      }
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Resume saved successfully',
      updated_at: resumeRes.rows[0].updated_at
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: 'Failed to update resume: ' + err.message });
  } finally {
    client.release();
  }
});

export default router;