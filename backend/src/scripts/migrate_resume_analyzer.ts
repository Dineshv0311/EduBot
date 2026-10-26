import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isRemoteDb =
  process.env.DATABASE_URL?.includes('rds.amazonaws.com') ||
  process.env.DATABASE_URL?.includes('supabase.co');

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

export async function runResumeAnalyzerMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Resume Analyzer & ATS Match Scoring migration...');
    await client.query('BEGIN');

    // 1. RESUME_DOCUMENT
    await client.query(`
      CREATE TABLE IF NOT EXISTS resume_document (
        document_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        extracted_text TEXT NOT NULL,
        parsed_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. RESUME_ANALYSIS
    await client.query(`
      CREATE TABLE IF NOT EXISTS resume_analysis (
        analysis_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        document_id INT REFERENCES resume_document(document_id) ON DELETE SET NULL,
        target_company VARCHAR(255),
        target_role VARCHAR(255) NOT NULL,
        job_description TEXT,
        analysis_mode VARCHAR(50) NOT NULL CHECK (analysis_mode IN ('role_company', 'job_description')),
        overall_score INT NOT NULL,
        job_match_score INT NOT NULL,
        resume_quality_score INT NOT NULL,
        keyword_coverage_score INT NOT NULL,
        section_completeness_score INT NOT NULL,
        readability_score INT NOT NULL,
        scoring_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
        missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        section_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
        formatting_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
        recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
        rubric_version VARCHAR(20) DEFAULT '1.0',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resume_document_user ON resume_document(user_id);
      CREATE INDEX IF NOT EXISTS idx_resume_analysis_user ON resume_analysis(user_id);
      CREATE INDEX IF NOT EXISTS idx_resume_analysis_doc ON resume_analysis(document_id);
      CREATE INDEX IF NOT EXISTS idx_resume_analysis_created ON resume_analysis(created_at DESC);
    `);

    await client.query('COMMIT');
    console.log('✅ Resume Analyzer tables and indexes created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('migrate_resume_analyzer.ts') || process.argv[1]?.endsWith('migrate_resume_analyzer.js')) {
  runResumeAnalyzerMigration()
    .then(() => {
      console.log('Migration completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
