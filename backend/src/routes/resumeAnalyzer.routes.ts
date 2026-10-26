import { Router, Response } from 'express';
import multer from 'multer';
import { pool } from '../server.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import {
  validateAndExtractResume,
  parseResumeSections,
  analyzeResume
} from '../services/resumeAnalyzer.service.js';

const router = Router();
router.use(requireAuth);

// In-memory multer storage with 5 MB cap
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 1. POST /api/resume-analyzer/upload — Upload and parse resume
router.post('/upload', upload.single('resume'), async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  if (!req.file) {
    return res.status(400).json({ error: 'Please select a PDF or DOCX resume to upload.' });
  }

  try {
    const { text, fileType, fileSize, warnings } = await validateAndExtractResume(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const parsedData = parseResumeSections(text);

    const insertRes = await pool.query(
      `INSERT INTO resume_document (user_id, file_name, file_type, file_size, extracted_text, parsed_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING document_id, file_name, file_type, file_size, created_at`,
      [userId, req.file.originalname, fileType, fileSize, text, JSON.stringify(parsedData)]
    );

    const doc = insertRes.rows[0];

    return res.status(201).json({
      message: 'Resume uploaded and parsed successfully.',
      document: {
        document_id: doc.document_id,
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size: doc.file_size,
        created_at: doc.created_at,
        warnings,
        extracted_text_preview: text.slice(0, 500),
        parsed_data: parsedData
      }
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to process resume upload.' });
  }
});

// 2. POST /api/resume-analyzer/analyze — Run ATS & Job Match analysis
router.post('/analyze', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const {
    document_id,
    target_company,
    target_role,
    job_description,
    analysis_mode = 'role_company',
    apiKey: clientApiKey
  } = req.body;

  if (!document_id) {
    return res.status(400).json({ error: 'document_id is required. Please upload or select a resume.' });
  }

  if (!target_role || typeof target_role !== 'string' || target_role.trim().length === 0) {
    return res.status(400).json({ error: 'Target Job Role is required (e.g., Software Engineer, Frontend Developer).' });
  }

  if (analysis_mode === 'job_description' && (!job_description || job_description.trim().length < 20)) {
    return res.status(400).json({ error: 'Please paste a complete job description (at least 20 characters) for Mode B matching.' });
  }

  try {
    // 1. Fetch document and verify user ownership (IDOR defense)
    const docRes = await pool.query(
      'SELECT document_id, file_name, extracted_text, parsed_data FROM resume_document WHERE document_id = $1 AND user_id = $2',
      [document_id, userId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Resume document not found or access denied.' });
    }

    const doc = docRes.rows[0];
    const parsedData = doc.parsed_data || parseResumeSections(doc.extracted_text);

    // 2. Perform ATS analysis
    const analysis = await analyzeResume({
      resumeText: doc.extracted_text,
      parsedData,
      targetCompany: target_company?.trim(),
      targetRole: target_role.trim(),
      jobDescription: job_description?.trim(),
      analysisMode: analysis_mode === 'job_description' ? 'job_description' : 'role_company',
      userGeminiApiKey: clientApiKey
    });

    // 3. Persist analysis results
    const insertRes = await pool.query(
      `INSERT INTO resume_analysis (
        user_id, document_id, target_company, target_role, job_description, analysis_mode,
        overall_score, job_match_score, resume_quality_score, keyword_coverage_score,
        section_completeness_score, readability_score, scoring_breakdown, strengths,
        missing_skills, section_feedback, formatting_warnings, recommendations, rubric_version
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18, $19
      ) RETURNING *`,
      [
        userId,
        doc.document_id,
        target_company?.trim() || null,
        target_role.trim(),
        job_description?.trim() || null,
        analysis_mode,
        analysis.overall_score,
        analysis.job_match_score,
        analysis.resume_quality_score,
        analysis.keyword_coverage_score,
        analysis.section_completeness_score,
        analysis.readability_score,
        JSON.stringify(analysis.scoring_breakdown),
        JSON.stringify(analysis.strengths),
        JSON.stringify(analysis.missing_skills),
        JSON.stringify(analysis.section_feedback),
        JSON.stringify(analysis.formatting_warnings),
        JSON.stringify(analysis.recommendations),
        analysis.rubric_version
      ]
    );

    const saved = insertRes.rows[0];

    return res.status(201).json({
      message: 'Resume analysis completed successfully.',
      analysis: {
        ...saved,
        file_name: doc.file_name,
        scoring_breakdown: analysis.scoring_breakdown,
        strengths: analysis.strengths,
        missing_skills: analysis.missing_skills,
        section_feedback: analysis.section_feedback,
        formatting_warnings: analysis.formatting_warnings,
        recommendations: analysis.recommendations,
        disclaimer: analysis.disclaimer
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to analyze resume: ' + err.message });
  }
});

// 3. GET /api/resume-analyzer/history — List past analyses for the authenticated student
router.get('/history', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const historyRes = await pool.query(
      `SELECT 
        a.analysis_id,
        a.document_id,
        d.file_name,
        a.target_company,
        a.target_role,
        a.analysis_mode,
        a.overall_score,
        a.job_match_score,
        a.resume_quality_score,
        a.keyword_coverage_score,
        a.section_completeness_score,
        a.readability_score,
        a.created_at
       FROM resume_analysis a
       LEFT JOIN resume_document d ON a.document_id = d.document_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    );

    return res.json({ history: historyRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve analysis history: ' + err.message });
  }
});

// 4. GET /api/resume-analyzer/documents — List student's uploaded resumes
router.get('/documents', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;

  try {
    const docsRes = await pool.query(
      `SELECT document_id, file_name, file_type, file_size, created_at,
              jsonb_array_length(parsed_data->'sections'->'skills') as skills_count
       FROM resume_document
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ documents: docsRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve documents: ' + err.message });
  }
});

// 5. GET /api/resume-analyzer/:id — View a specific analysis in detail
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const analysisId = parseInt(req.params.id, 10);

  if (isNaN(analysisId)) {
    return res.status(400).json({ error: 'Invalid analysis ID.' });
  }

  try {
    const analysisRes = await pool.query(
      `SELECT a.*, d.file_name
       FROM resume_analysis a
       LEFT JOIN resume_document d ON a.document_id = d.document_id
       WHERE a.analysis_id = $1 AND a.user_id = $2`,
      [analysisId, userId]
    );

    if (analysisRes.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis record not found or access denied.' });
    }

    const row = analysisRes.rows[0];
    return res.json({
      analysis: {
        ...row,
        disclaimer: 'This score is an automated estimation designed to benchmark resume readiness and ATS compliance. Actual applicant tracking systems and recruiters evaluate candidates through varied internal criteria.'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch analysis: ' + err.message });
  }
});

// 6. DELETE /api/resume-analyzer/:id — Delete an analysis
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const analysisId = parseInt(req.params.id, 10);

  if (isNaN(analysisId)) {
    return res.status(400).json({ error: 'Invalid analysis ID.' });
  }

  try {
    const delRes = await pool.query(
      'DELETE FROM resume_analysis WHERE analysis_id = $1 AND user_id = $2 RETURNING analysis_id',
      [analysisId, userId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found or access denied.' });
    }

    return res.json({ message: 'Analysis deleted successfully.', analysis_id: analysisId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete analysis: ' + err.message });
  }
});

// 7. DELETE /api/resume-analyzer/document/:id — Delete an uploaded document
router.delete('/document/:id', async (req: AuthRequest, res: Response) => {
  const userId = req.user?.user_id;
  const docId = parseInt(req.params.id, 10);

  if (isNaN(docId)) {
    return res.status(400).json({ error: 'Invalid document ID.' });
  }

  try {
    const delRes = await pool.query(
      'DELETE FROM resume_document WHERE document_id = $1 AND user_id = $2 RETURNING document_id',
      [docId, userId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found or access denied.' });
    }

    return res.json({ message: 'Resume document deleted successfully.', document_id: docId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete document: ' + err.message });
  }
});

export default router;
