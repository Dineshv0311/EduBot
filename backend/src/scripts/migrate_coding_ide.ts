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

export async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running Coding IDE migration...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS coding_problem (
        problem_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(50) DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
        topic VARCHAR(100) NOT NULL,
        input_format TEXT,
        output_format TEXT,
        constraints TEXT,
        example_input TEXT,
        example_output TEXT,
        example_explanation TEXT,
        supported_languages TEXT[] DEFAULT ARRAY['python'],
        starter_code JSONB DEFAULT '{"python": "import sys\\n\\ndef solve():\\n    # Read all input from standard input\\n    input_data = sys.stdin.read().split()\\n    if not input_data:\\n        return\\n    # Write your solution logic here\\n    pass\\n\\nif __name__ == \\"__main__\\":\\n    solve()\\n"}'::jsonb,
        time_limit_ms INT DEFAULT 3000,
        memory_limit_kb INT DEFAULT 128000,
        status VARCHAR(50) DEFAULT 'Published' CHECK (status IN ('Draft', 'Published', 'Archived')),
        created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coding_test_case (
        test_case_id SERIAL PRIMARY KEY,
        problem_id INT NOT NULL REFERENCES coding_problem(problem_id) ON DELETE CASCADE,
        input TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_sample BOOLEAN DEFAULT FALSE,
        description VARCHAR(255),
        order_index INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coding_submission (
        submission_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        problem_id INT NOT NULL REFERENCES coding_problem(problem_id) ON DELETE CASCADE,
        source_code TEXT NOT NULL,
        language VARCHAR(50) NOT NULL DEFAULT 'python',
        verdict VARCHAR(50) NOT NULL,
        passed_count INT DEFAULT 0,
        total_count INT DEFAULT 0,
        execution_time NUMERIC(8, 3) DEFAULT 0,
        memory_used INT DEFAULT 0,
        error_message TEXT,
        submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS coding_submission_case (
        id SERIAL PRIMARY KEY,
        submission_id INT NOT NULL REFERENCES coding_submission(submission_id) ON DELETE CASCADE,
        test_case_id INT NOT NULL REFERENCES coding_test_case(test_case_id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        actual_output TEXT,
        execution_time NUMERIC(8, 3),
        memory_used INT,
        error_output TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_coding_problem_status ON coding_problem(status);
      CREATE INDEX IF NOT EXISTS idx_coding_problem_slug ON coding_problem(slug);
      CREATE INDEX IF NOT EXISTS idx_coding_test_case_problem ON coding_test_case(problem_id);
      CREATE INDEX IF NOT EXISTS idx_coding_submission_user ON coding_submission(user_id);
      CREATE INDEX IF NOT EXISTS idx_coding_submission_problem ON coding_submission(problem_id);
    `);

    // Check if initial problems exist, if not seed default problems
    const existing = await client.query('SELECT COUNT(*) FROM coding_problem');
    if (parseInt(existing.rows[0].count, 10) === 0) {
      console.log('Seeding initial practice problems...');

      // Problem 1: Two Sum
      const p1 = await client.query(`
        INSERT INTO coding_problem (
          title, slug, description, difficulty, topic,
          input_format, output_format, constraints,
          example_input, example_output, example_explanation,
          starter_code, status
        ) VALUES (
          'Two Sum',
          'two-sum',
          'Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nReturn the answer with space-separated indices in ascending order.',
          'Easy',
          'Arrays',
          'First line contains integer N (size of array).\nSecond line contains N space-separated integers.\nThird line contains integer target.',
          'Two space-separated 0-based indices in ascending order.',
          '2 <= N <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nExactly one valid answer exists.',
          '4\n2 7 11 15\n9',
          '0 1',
          'Because nums[0] + nums[1] == 2 + 7 == 9, we return 0 1.',
          '{"python": "import sys\\n\\ndef solve():\\n    input_data = sys.stdin.read().split()\\n    if not input_data:\\n        return\\n    n = int(input_data[0])\\n    nums = [int(x) for x in input_data[1:n+1]]\\n    target = int(input_data[n+1])\\n    \\n    # Write your solution here\\n    seen = {}\\n    for i, num in enumerate(nums):\\n        comp = target - num\\n        if comp in seen:\\n            print(f\\"{seen[comp]} {i}\\")\\n            return\\n        seen[num] = i\\n\\nif __name__ == \\"__main__\\":\\n    solve()\\n"}'::jsonb,
          'Published'
        ) RETURNING problem_id;
      `);
      const p1Id = p1.rows[0].problem_id;

      // Test cases for Two Sum
      await client.query(`
        INSERT INTO coding_test_case (problem_id, input, expected_output, is_sample, description, order_index)
        VALUES 
          ($1, '4\n2 7 11 15\n9', '0 1', true, 'Sample 1: Standard case', 1),
          ($1, '3\n3 2 4\n6', '1 2', true, 'Sample 2: Unsorted array', 2),
          ($1, '2\n3 3\n6', '0 1', false, 'Hidden 1: Duplicate values', 3),
          ($1, '5\n-1 -2 -3 -4 -5\n-8', '2 4', false, 'Hidden 2: Negative numbers', 4),
          ($1, '6\n10 20 30 40 50 60\n110', '4 5', false, 'Hidden 3: Large elements', 5);
      `, [p1Id]);

      // Problem 2: Reverse a String
      const p2 = await client.query(`
        INSERT INTO coding_problem (
          title, slug, description, difficulty, topic,
          input_format, output_format, constraints,
          example_input, example_output, example_explanation,
          starter_code, status
        ) VALUES (
          'Reverse Words in String',
          'reverse-words-in-string',
          'Given an input string \`s\`, reverse the order of the words.\n\nA word is defined as a sequence of non-space characters. The words in \`s\` will be separated by at least one space.\n\nReturn a string of the words in reverse order concatenated by a single space.',
          'Medium',
          'Strings',
          'A single line containing the string s.',
          'The reversed string with words joined by single spaces.',
          '1 <= s.length <= 10^4\ns contains English letters (upper-case and lower-case), digits, and spaces.',
          'the sky is blue',
          'blue is sky the',
          'The words are blue, is, sky, the in reversed order.',
          '{"python": "import sys\\n\\ndef solve():\\n    lines = sys.stdin.read().splitlines()\\n    if not lines:\\n        return\\n    s = lines[0]\\n    words = s.strip().split()\\n    print(\\" \\".join(reversed(words)))\\n\\nif __name__ == \\"__main__\\":\\n    solve()\\n"}'::jsonb,
          'Published'
        ) RETURNING problem_id;
      `);
      const p2Id = p2.rows[0].problem_id;

      await client.query(`
        INSERT INTO coding_test_case (problem_id, input, expected_output, is_sample, description, order_index)
        VALUES 
          ($1, 'the sky is blue', 'blue is sky the', true, 'Sample 1', 1),
          ($1, '  hello world  ', 'world hello', true, 'Sample 2: Leading and trailing spaces', 2),
          ($1, 'a good   example', 'example good a', false, 'Hidden 1: Multiple spaces between words', 3),
          ($1, 'singleword', 'singleword', false, 'Hidden 2: Single word', 4);
      `, [p2Id]);

      // Problem 3: Valid Palindrome
      const p3 = await client.query(`
        INSERT INTO coding_problem (
          title, slug, description, difficulty, topic,
          input_format, output_format, constraints,
          example_input, example_output, example_explanation,
          starter_code, status
        ) VALUES (
          'Valid Palindrome',
          'valid-palindrome',
          'A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\n\nGiven a string \`s\`, print \`true\` if it is a palindrome, or \`false\` otherwise.',
          'Easy',
          'Strings',
          'A single line containing string s.',
          'Print true or false (lowercase).',
          '1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.',
          'A man, a plan, a canal: Panama',
          'true',
          'amanaplanacanalpanama is a palindrome.',
          '{"python": "import sys\\n\\ndef solve():\\n    line = sys.stdin.read().rstrip(\\"\\r\\n\\")\\n    cleaned = [c.lower() for c in line if c.isalnum()]\\n    if cleaned == cleaned[::-1]:\\n        print(\\"true\\")\\n    else:\\n        print(\\"false\\")\\n\\nif __name__ == \\"__main__\\":\\n    solve()\\n"}'::jsonb,
          'Published'
        ) RETURNING problem_id;
      `);
      const p3Id = p3.rows[0].problem_id;

      await client.query(`
        INSERT INTO coding_test_case (problem_id, input, expected_output, is_sample, description, order_index)
        VALUES 
          ($1, 'A man, a plan, a canal: Panama', 'true', true, 'Sample 1', 1),
          ($1, 'race a car', 'false', true, 'Sample 2: Non palindrome', 2),
          ($1, ' ', 'true', false, 'Hidden 1: Empty alphanumeric string', 3),
          ($1, '0P', 'false', false, 'Hidden 2: Number and letter', 4);
      `, [p3Id]);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] && process.argv[1].includes('migrate_coding_ide')) {
  runMigration()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}
