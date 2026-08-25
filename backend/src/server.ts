import app from './app.js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.listen(PORT, () => {
  console.log(`EduBot backend running on http://localhost:${PORT}`);
});