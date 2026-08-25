import app from './app.js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Enable SSL only for remote cloud databases (RDS, Supabase), disabled for local Docker
const isRemoteDb = 
  process.env.DATABASE_URL?.includes('rds.amazonaws.com') ||
  process.env.DATABASE_URL?.includes('supabase.co');

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});

app.listen(PORT, () => {
  console.log(`EduBot backend running on http://localhost:${PORT}`);
});