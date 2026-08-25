import { Router, Response } from 'express';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/summary — Aggregate metrics across all 15 tables & generate recommendations
router.get('/summary', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    // 1. Coding Activity Stats
    const codingRes = await pool.query(
      `SELECT 
         COUNT(*) AS total_solved,
         COUNT(*) FILTER (WHERE completion_status = 'Correct') AS correct_count,
         COUNT(*) FILTER (WHERE completion_status = 'Incorrect') AS incorrect_count
       FROM coding_activity
       WHERE user_id = $1`,
      [userId]
    );

    // Topic-level breakdown for recommendation heuristics
    const codingTopicsRes = await pool.query(
      `SELECT topic, 
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE completion_status = 'Correct') AS correct
       FROM coding_activity
       WHERE user_id = $1
       GROUP BY topic`,
      [userId]
    );

    // 2. Resume Completeness
    const resumeRes = await pool.query(
      `SELECT r.resume_id, r.summary,
              (SELECT COUNT(*) FROM resume_project p WHERE p.resume_id = r.resume_id)::int AS project_count,
              (SELECT COUNT(*) FROM resume_skill s WHERE s.resume_id = r.resume_id)::int AS skill_count
       FROM resume r
       WHERE r.user_id = $1`,
      [userId]
    );

    // 3. Mock Interview Performance
    const interviewRes = await pool.query(
      `SELECT 
         COUNT(*)::int AS total_interviews,
         COALESCE(AVG(total_score), 0)::numeric(5,2) AS avg_score,
         COALESCE(MAX(total_score), 0)::numeric(5,2) AS best_score
       FROM mock_interview_attempt
       WHERE user_id = $1 AND completed_at IS NOT NULL`,
      [userId]
    );

    // 4. Aptitude Performance
    const aptitudeRes = await pool.query(
      `SELECT 
         COUNT(*)::int AS total_tests,
         COALESCE(AVG(score), 0)::numeric(5,2) AS avg_score,
         COALESCE(MAX(score), 0)::numeric(5,2) AS best_score
       FROM aptitude_attempt
       WHERE user_id = $1 AND completed_at IS NOT NULL`,
      [userId]
    );

    // ----------------------------------------------------
    // RECOMMENDATION ENGINE (Rule-Based Heuristics)
    // ----------------------------------------------------
    const codingTotal = parseInt(codingRes.rows[0].total_solved, 10) || 0;
    const resume = resumeRes.rows[0] || { summary: '', project_count: 0, skill_count: 0 };
    const interviewCount = interviewRes.rows[0].total_interviews || 0;
    const aptitudeAvg = parseFloat(aptitudeRes.rows[0].avg_score) || 0;
    const aptitudeCount = aptitudeRes.rows[0].total_tests || 0;

    const newRecommendations: { topic: string; reason: string; type: string }[] = [];

    // Rule 1: Weak Coding Topic (< 60% accuracy) or Low Solved Count
    if (codingTotal < 5) {
      newRecommendations.push({
        topic: 'DSA Foundation',
        reason: 'Solve at least 5 coding problems to build consistent daily momentum.',
        type: 'Coding Tracker'
      });
    }

    for (const t of codingTopicsRes.rows) {
      const topicTotal = parseInt(t.total, 10);
      const topicCorrect = parseInt(t.correct, 10);
      const acc = topicTotal > 0 ? (topicCorrect / topicTotal) * 100 : 0;
      if (acc < 60 && topicTotal >= 1) {
        newRecommendations.push({
          topic: `${t.topic} Practice`,
          reason: `Accuracy in ${t.topic} is currently ${Math.round(acc)}%. Review and re-attempt missed questions.`,
          type: 'Coding Tracker'
        });
      }
    }

    // Rule 2: Resume Incompleteness
    if (!resume.summary || resume.summary.length < 50) {
      newRecommendations.push({
        topic: 'Resume Summary',
        reason: 'Your professional summary is brief or missing. Add details about your technical stack and placement goals.',
        type: 'Resume Builder'
      });
    }
    if (resume.project_count < 2) {
      newRecommendations.push({
        topic: 'Project Portfolio',
        reason: 'Add at least 2 full-stack or systems projects to your resume before sending applications.',
        type: 'Resume Builder'
      });
    }

    // Rule 3: Aptitude Practice Gap
    if (aptitudeCount === 0) {
      newRecommendations.push({
        topic: 'Quantitative Speed Assessment',
        reason: 'Take your first timed aptitude assessment to baseline problem-solving speed.',
        type: 'Aptitude Test'
      });
    } else if (aptitudeAvg < 65) {
      newRecommendations.push({
        topic: 'Aptitude Accuracy',
        reason: `Your average aptitude score is ${aptitudeAvg}%. Practice time management to score above 70%.`,
        type: 'Aptitude Test'
      });
    }

    // Rule 4: Mock Interview Gap
    if (interviewCount === 0) {
      newRecommendations.push({
        topic: 'TechCorp Mock Interview',
        reason: 'Complete your first company-specific technical interview to prepare for campus hiring.',
        type: 'Mock Interview'
      });
    }

    // Upsert new active recommendations without duplicate inserts
    for (const rec of newRecommendations) {
      const existing = await pool.query(
        `SELECT recommendation_id FROM recommendation 
         WHERE user_id = $1 AND topic = $2 AND status = 'Active'`,
        [userId, rec.topic]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO recommendation (user_id, topic, reason, recommendation_type, status)
           VALUES ($1, $2, $3, $4, 'Active')`,
          [userId, rec.topic, rec.reason, rec.type]
        );
      }
    }

    // Fetch all currently active recommendations
    const recommendationsRes = await pool.query(
      `SELECT recommendation_id, topic, reason, recommendation_type, generated_at, status
       FROM recommendation
       WHERE user_id = $1 AND status = 'Active'
       ORDER BY generated_at DESC`,
      [userId]
    );

    // ----------------------------------------------------
    // PLACEMENT READINESS SCORE CALCULATION (0 to 100)
    // ----------------------------------------------------
    // Coding (25 pts) + Resume (25 pts) + Aptitude (25 pts) + Interview (25 pts)
    const codingScore = Math.min(25, (parseInt(codingRes.rows[0].correct_count, 10) || 0) * 5);
    const resumeScore = Math.min(25, (resume.summary ? 10 : 0) + (resume.project_count >= 2 ? 10 : resume.project_count * 5) + (resume.skill_count >= 3 ? 5 : 0));
    const aptitudeScore = Math.min(25, Math.round((aptitudeAvg / 100) * 25));
    const interviewScore = Math.min(25, Math.round((parseFloat(interviewRes.rows[0].avg_score) / 100) * 25));

    const overallReadiness = codingScore + resumeScore + aptitudeScore + interviewScore;

    return res.json({
      readiness_score: overallReadiness,
      breakdown: {
        coding_score: codingScore,
        resume_score: resumeScore,
        aptitude_score: aptitudeScore,
        interview_score: interviewScore
      },
      stats: {
        coding: {
          total_solved: codingTotal,
          correct: parseInt(codingRes.rows[0].correct_count, 10) || 0,
          incorrect: parseInt(codingRes.rows[0].incorrect_count, 10) || 0
        },
        resume: {
          has_summary: !!resume.summary,
          project_count: resume.project_count,
          skill_count: resume.skill_count
        },
        interview: {
          total_attempts: interviewCount,
          avg_score: parseFloat(interviewRes.rows[0].avg_score) || 0,
          best_score: parseFloat(interviewRes.rows[0].best_score) || 0
        },
        aptitude: {
          total_attempts: aptitudeCount,
          avg_score: aptitudeAvg,
          best_score: parseFloat(aptitudeRes.rows[0].best_score) || 0
        }
      },
      recommendations: recommendationsRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate dashboard summary: ' + err.message });
  }
});

// PATCH /api/dashboard/recommendation/:id/dismiss — Dismiss recommendation
router.patch('/recommendation/:id/dismiss', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE recommendation
       SET status = 'Dismissed'
       WHERE recommendation_id = $1 AND user_id = $2
       RETURNING recommendation_id, status`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recommendation not found.' });
    }

    return res.json({ message: 'Recommendation dismissed', recommendation: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to dismiss recommendation: ' + err.message });
  }
});

export default router;