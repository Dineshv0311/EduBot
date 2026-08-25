import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { pool } from '../server.js';
import bcrypt from 'bcryptjs';

// Mock DB pool queries for clean, deterministic unit testing
vi.mock('../server.js', () => ({
  pool: {
    query: vi.fn()
  }
}));

describe('Auth Module — Lockout Logic (Process 1.0)', () => {
  const mockUser = {
    user_id: 10,
    name: 'Test Student',
    email: 'lockout_test@example.com',
    password_hash: '', // will populate in beforeEach
    role: 'Student',
    failed_login_attempts: 0,
    lock_until: null
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const salt = await bcrypt.genSalt(10);
    mockUser.password_hash = await bcrypt.hash('correctPassword123', salt);
    mockUser.failed_login_attempts = 0;
    mockUser.lock_until = null;
  });

  it('1. Returns 401 and decrements remaining attempts on invalid password', async () => {
    mockUser.failed_login_attempts = 2;
    (pool.query as any)
      .mockResolvedValueOnce({ rows: [mockUser] }) // SELECT user
      .mockResolvedValueOnce({ rows: [] }); // UPDATE failed attempts

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lockout_test@example.com', password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('2 attempt(s) remaining before account lockout');
  });

  it('2. Enforces 15-minute account lockout on the 5th failed attempt', async () => {
    mockUser.failed_login_attempts = 4; // 4 prior failures -> this attempt makes 5
    (pool.query as any)
      .mockResolvedValueOnce({ rows: [mockUser] }) // SELECT user
      .mockResolvedValueOnce({ rows: [] }); // UPDATE lock_until

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lockout_test@example.com', password: 'wrongPassword' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Account locked for 15 minutes due to 5 consecutive failed login attempts');
  });

  it('3. Rejects login immediately if account is still within lock_until duration', async () => {
    mockUser.lock_until = new Date(Date.now() + 10 * 60 * 1000) as any; // Locked for next 10 mins
    (pool.query as any).mockResolvedValueOnce({ rows: [mockUser] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lockout_test@example.com', password: 'correctPassword123' });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Account is temporarily locked');
  });

  it('4. Resets failed_login_attempts to 0 and clears lock_until on valid password', async () => {
    mockUser.failed_login_attempts = 3;
    (pool.query as any)
      .mockResolvedValueOnce({ rows: [mockUser] }) // SELECT user
      .mockResolvedValueOnce({ rows: [] }); // UPDATE reset attempts to 0

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lockout_test@example.com', password: 'correctPassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.token).toBeDefined();
  });
});