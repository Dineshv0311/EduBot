import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../server.js';
import { requireAuth, AuthRequest, AuthUser } from '../middleware/auth.js';

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const userRole = role === 'Admin' ? 'Admin' : 'Student';

  try {
    const existingUser = await pool.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), password_hash, userRole]
    );

    const newUser: AuthUser = {
      user_id: result.rows[0].user_id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      role: result.rows[0].role
    };

    const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production_12345';
    const token = jwt.sign(newUser, secret, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: result.rows[0]
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login (with 5-attempt lockout logic)
router.post('/login', async (req, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check account lockout status
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lock_until).getTime() - Date.now()) / (1000 * 60)
      );
      return res.status(403).json({
        error: `Account is temporarily locked. Try again in ${remainingMinutes} minute(s).`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      const newAttempts = (user.failed_login_attempts || 0) + 1;

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1, lock_until = $2 WHERE user_id = $3',
          [newAttempts, lockUntil, user.user_id]
        );
        return res.status(403).json({
          error: `Account locked for 15 minutes due to 5 consecutive failed login attempts.`
        });
      } else {
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE user_id = $2',
          [newAttempts, user.user_id]
        );
        const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
        return res.status(401).json({
          error: `Invalid credentials. ${remaining} attempt(s) remaining before account lockout.`
        });
      }
    }

    // Reset failed login attempts on valid login
    await pool.query(
      'UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE user_id = $1',
      [user.user_id]
    );

    const userPayload: AuthUser = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const secret = process.env.JWT_SECRET || 'supersecretjwtkey_change_in_production_12345';
    const token = jwt.sign(userPayload, secret, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Login error: ' + err.message });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1',
      [req.user?.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error fetching user profile: ' + err.message });
  }
});

export default router;