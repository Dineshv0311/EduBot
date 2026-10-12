import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import jwt from 'jsonwebtoken';

// Mock DB pool
vi.mock('../server.js', () => ({
  pool: {
    query: vi.fn()
  }
}));

describe('AI Helper Module — Chat & Knowledge Base', () => {
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production_12345';
  let studentToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    studentToken = jwt.sign(
      { user_id: 1, email: 'student@example.com', role: 'Student', name: 'Alex Hunter' },
      secret
    );
  });

  it('1. Rejects unauthenticated chat requests with 401', async () => {
    const res = await request(app)
      .post('/api/helper/chat')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
  });

  it('2. Responds with structured portal guidance when query is general', async () => {
    const res = await request(app)
      .post('/api/helper/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'What can you help me with?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toBeDefined();
    expect(res.body.reply).toContain('EduBot Placement & Portal Assistant');
    expect(res.body.source).toBe('knowledge_base');
  });

  it('3. Answers TechCorp Labs interview query with structured guide', async () => {
    const res = await request(app)
      .post('/api/helper/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'Tell me about TechCorp Labs interview' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('TechCorp Labs');
    expect(res.body.reply).toContain('Node.js');
    expect(res.body.source).toBe('knowledge_base');
  });

  it('4. Answers FinTech Solutions queries with structured concurrency guide', async () => {
    const res = await request(app)
      .post('/api/helper/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'What does FinTech Solutions ask?' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('FinTech Solutions');
    expect(res.body.reply).toContain('Database Concurrency');
  });

  it('5. Answers portal issue queries with troubleshooting steps', async () => {
    const res = await request(app)
      .post('/api/helper/chat')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ message: 'My test score is not working' });

    expect(res.status).toBe(200);
    expect(res.body.reply).toContain('Troubleshooting & Issue Resolution');
  });
});
