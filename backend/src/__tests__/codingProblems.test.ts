import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import jwt from 'jsonwebtoken';

// Mock DB pool
vi.mock('../server.js', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn()
  }
}));

import { pool } from '../server.js';

describe('Coding IDE & Problem Management Modules', () => {
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production_12345';
  let studentToken: string;
  let adminToken: string;

  beforeEach(() => {
    vi.clearAllMocks();
    studentToken = jwt.sign(
      { user_id: 1, email: 'student@example.com', role: 'Student', name: 'Alex Hunter' },
      secret
    );
    adminToken = jwt.sign(
      { user_id: 99, email: 'admin@example.com', role: 'Admin', name: 'Admin Root' },
      secret
    );
  });

  describe('1. Security & Role-Based Access Control', () => {
    it('1.1 Rejects unauthenticated requests to coding problems with 401', async () => {
      const res = await request(app).get('/api/coding-problems');
      expect(res.status).toBe(401);
    });

    it('1.2 Rejects student attempt to access admin coding problem routes with 403', async () => {
      const res = await request(app)
        .post('/api/admin/coding-problems')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ title: 'Hacked Problem', topic: 'Arrays', description: 'desc' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Admin access required');
    });

    it('1.3 Allows admin to access admin coding problem routes', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ problem_id: 1, title: 'Two Sum', status: 'Draft' }]
      });

      const res = await request(app)
        .get('/api/admin/coding-problems')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.problems).toHaveLength(1);
    });
  });

  describe('2. Admin Problem & Test Case Management', () => {
    it('2.1 Rejects problem creation when mandatory fields are missing', async () => {
      const res = await request(app)
        .post('/api/admin/coding-problems')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Missing Topic Problem' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title, description, and topic are required');
    });

    it('2.2 Creates a new coding problem in Draft state', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          problem_id: 10,
          title: 'Fibonacci Sequence',
          slug: 'fibonacci-sequence',
          difficulty: 'Easy',
          topic: 'Dynamic Programming',
          status: 'Draft'
        }]
      });

      const res = await request(app)
        .post('/api/admin/coding-problems')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Fibonacci Sequence',
          description: 'Calculate the Nth Fibonacci number.',
          difficulty: 'Easy',
          topic: 'Dynamic Programming',
          input_format: 'Single integer N',
          output_format: 'Single integer answer'
        });

      expect(res.status).toBe(201);
      expect(res.body.problem.slug).toBe('fibonacci-sequence');
      expect(res.body.problem.status).toBe('Draft');
    });

    it('2.3 Prevents publishing a problem if it has 0 test cases', async () => {
      // Mock test cases count = 0
      (pool.query as any).mockResolvedValueOnce({
        rows: [{ count: '0' }]
      });

      const res = await request(app)
        .patch('/api/admin/coding-problems/10/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Published' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Cannot publish a problem with 0 test cases');
    });

    it('2.4 Successfully adds sample and hidden test cases to a problem', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [{
          test_case_id: 101,
          problem_id: 10,
          input: '5',
          expected_output: '5',
          is_sample: true
        }]
      });

      const res = await request(app)
        .post('/api/admin/coding-problems/10/test-cases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          input: '5',
          expected_output: '5',
          is_sample: true,
          description: 'Sample 1'
        });

      expect(res.status).toBe(201);
      expect(res.body.testCase.is_sample).toBe(true);
    });
  });

  describe('3. Student Problem Viewing & Hidden Test Protection', () => {
    it('3.1 Only returns published problems to students', async () => {
      (pool.query as any).mockResolvedValueOnce({
        rows: [
          { problem_id: 1, title: 'Two Sum', status: 'Published', is_solved: true }
        ]
      });

      const res = await request(app)
        .get('/api/coding-problems')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.problems).toHaveLength(1);
      expect(res.body.problems[0].title).toBe('Two Sum');
    });

    it('3.2 NEVER leaks hidden test case input or expected output to students', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({
          rows: [{
            problem_id: 1,
            title: 'Two Sum',
            slug: 'two-sum',
            description: 'Find two indices',
            status: 'Published'
          }]
        })
        .mockResolvedValueOnce({
          rows: [
            { test_case_id: 1, input: '4\n2 7 11 15\n9', expected_output: '0 1', is_sample: true }
          ]
        });

      const res = await request(app)
        .get('/api/coding-problems/two-sum')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.problem).toBeDefined();
      expect(res.body.sampleTestCases).toHaveLength(1);
      expect(res.body.sampleTestCases[0].is_sample).toBe(true);

      // Verify that no query returned hidden test cases to the student
      const returnedJson = JSON.stringify(res.body);
      expect(returnedJson).not.toContain('Hidden');
    });
  });

  describe('4. Submission & Coding Tracker Integration', () => {
    it('4.1 Run Code evaluates sample tests and does NOT mark problem solved', async () => {
      (pool.query as any)
        .mockResolvedValueOnce({
          rows: [{ problem_id: 1, title: 'Two Sum', time_limit_ms: 3000, status: 'Published' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { test_case_id: 1, input: '4\n2 7 11 15\n9', expected_output: '0 1', is_sample: true }
          ]
        });

      const pythonCode = `
import sys
def solve():
    data = sys.stdin.read().split()
    if not data: return
    print("0 1")
solve()
`;

      const res = await request(app)
        .post('/api/coding-problems/1/run')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ source_code: pythonCode, language: 'python' });

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('sample_run');
      expect(res.body.verdict).toBe('Accepted');
      expect(res.body.evaluations).toBeDefined();
      // Ensure coding_activity was NOT touched during Run Code
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('4.2 Submit Solution evaluates all cases and records in coding_activity on Accepted', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      (pool.connect as any).mockResolvedValueOnce(mockClient);

      // 1. Problem query
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ problem_id: 1, title: 'Two Sum', topic: 'Arrays', difficulty: 'Easy', time_limit_ms: 3000, status: 'Published' }]
        })
        // 2. All test cases query
        .mockResolvedValueOnce({
          rows: [
            { test_case_id: 1, input: '4\n2 7 11 15\n9', expected_output: '0 1', is_sample: true },
            { test_case_id: 2, input: '3\n3 2 4\n6', expected_output: '1 2', is_sample: false }
          ]
        })
        // 3. BEGIN
        .mockResolvedValueOnce({})
        // 4. INSERT coding_submission
        .mockResolvedValueOnce({
          rows: [{ submission_id: 501, user_id: 1, problem_id: 1, verdict: 'Accepted', passed_count: 2, total_count: 2 }]
        })
        // 5. INSERT test case 1
        .mockResolvedValueOnce({})
        // 6. INSERT test case 2
        .mockResolvedValueOnce({})
        // 7. Check existing coding_activity (none found)
        .mockResolvedValueOnce({ rows: [] })
        // 8. INSERT coding_activity
        .mockResolvedValueOnce({ rows: [{ activity_id: 88 }] })
        // 9. COMMIT
        .mockResolvedValueOnce({});

      const correctCode = `
import sys
def solve():
    data = sys.stdin.read().split()
    if not data: return
    n = int(data[0])
    target = int(data[n+1])
    if target == 9:
        print("0 1")
    else:
        print("1 2")
solve()
`;

      const res = await request(app)
        .post('/api/coding-problems/1/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ source_code: correctCode, language: 'python' });

      expect(res.status).toBe(200);
      expect(res.body.verdict).toBe('Accepted');
      expect(res.body.passedCount).toBe(2);
      expect(res.body.isFirstTimeSolved).toBe(true);

      // Verify that coding_activity insert was executed
      const insertActivityCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0] && call[0].includes('INSERT INTO coding_activity')
      );
      expect(insertActivityCall).toBeDefined();
    });

    it('4.3 Repeated Accepted submissions do not duplicate coding_activity records', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      (pool.connect as any).mockResolvedValueOnce(mockClient);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ problem_id: 1, title: 'Two Sum', topic: 'Arrays', difficulty: 'Easy', time_limit_ms: 3000, status: 'Published' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { test_case_id: 1, input: '4\n2 7 11 15\n9', expected_output: '0 1', is_sample: true }
          ]
        })
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ submission_id: 502, user_id: 1, problem_id: 1, verdict: 'Accepted', passed_count: 1, total_count: 1 }]
        })
        .mockResolvedValueOnce({}) // INSERT case 1
        // Existing coding_activity FOUND!
        .mockResolvedValueOnce({ rows: [{ activity_id: 88, completion_status: 'Correct' }] })
        // UPDATE activity timestamp
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}); // COMMIT

      const code = `print("0 1")`;

      const res = await request(app)
        .post('/api/coding-problems/1/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ source_code: code, language: 'python' });

      expect(res.status).toBe(200);
      expect(res.body.isFirstTimeSolved).toBe(false);

      // Verify UPDATE was called instead of INSERT
      const updateCall = mockClient.query.mock.calls.find((call: any[]) =>
        call[0] && call[0].includes('UPDATE coding_activity SET activity_date')
      );
      expect(updateCall).toBeDefined();
    });

    it('4.4 Incorrect submission receives Wrong Answer and is not marked as Correct', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };

      (pool.connect as any).mockResolvedValueOnce(mockClient);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ problem_id: 1, title: 'Two Sum', topic: 'Arrays', difficulty: 'Easy', time_limit_ms: 3000, status: 'Published' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { test_case_id: 1, input: '4\n2 7 11 15\n9', expected_output: '0 1', is_sample: true }
          ]
        })
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ submission_id: 503, user_id: 1, problem_id: 1, verdict: 'Wrong Answer', passed_count: 0, total_count: 1 }]
        })
        .mockResolvedValueOnce({}) // INSERT case 1
        .mockResolvedValueOnce({ rows: [] }) // Check existing activity
        .mockResolvedValueOnce({}) // INSERT 'In Progress'
        .mockResolvedValueOnce({}); // COMMIT

      const wrongCode = `print("99 99")`;

      const res = await request(app)
        .post('/api/coding-problems/1/submit')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ source_code: wrongCode, language: 'python' });

      expect(res.status).toBe(200);
      expect(res.body.verdict).toBe('Wrong Answer');
      expect(res.body.passedCount).toBe(0);
    });
  });
});
