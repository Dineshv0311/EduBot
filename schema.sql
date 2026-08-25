-- EduBot AI Complete 15-Table Production Schema

-- Drop tables in reverse dependency order if resetting
DROP TABLE IF EXISTS recommendation CASCADE;
DROP TABLE IF EXISTS aptitude_answer CASCADE;
DROP TABLE IF EXISTS aptitude_attempt CASCADE;
DROP TABLE IF EXISTS aptitude_question CASCADE;
DROP TABLE IF EXISTS aptitude_test CASCADE;
DROP TABLE IF EXISTS interview_response CASCADE;
DROP TABLE IF EXISTS mock_interview_attempt CASCADE;
DROP TABLE IF EXISTS interview_question CASCADE;
DROP TABLE IF EXISTS company_content CASCADE;
DROP TABLE IF EXISTS company CASCADE;
DROP TABLE IF EXISTS resume_skill CASCADE;
DROP TABLE IF EXISTS resume_project CASCADE;
DROP TABLE IF EXISTS resume CASCADE;
DROP TABLE IF EXISTS coding_activity CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USER
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Student' CHECK (role IN ('Student', 'Admin')),
    failed_login_attempts INT DEFAULT 0,
    lock_until TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. CODING_ACTIVITY
CREATE TABLE coding_activity (
    activity_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    problem_name VARCHAR(255) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    completion_status VARCHAR(50) NOT NULL CHECK (completion_status IN ('Correct', 'Incorrect', 'In Progress')),
    activity_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. RESUME
CREATE TABLE resume (
    resume_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. RESUME_PROJECT
CREATE TABLE resume_project (
    project_id SERIAL PRIMARY KEY,
    resume_id INT NOT NULL REFERENCES resume(resume_id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    technologies VARCHAR(255),
    project_url VARCHAR(500)
);

-- 5. RESUME_SKILL
CREATE TABLE resume_skill (
    skill_id SERIAL PRIMARY KEY,
    resume_id INT NOT NULL REFERENCES resume(resume_id) ON DELETE CASCADE,
    skill_name VARCHAR(100) NOT NULL,
    skill_category VARCHAR(100) NOT NULL
);

-- 6. COMPANY
CREATE TABLE company (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) UNIQUE NOT NULL,
    industry VARCHAR(100) NOT NULL,
    description TEXT,
    website VARCHAR(500)
);

-- 7. COMPANY_CONTENT
CREATE TABLE company_content (
    content_id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES company(company_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    description TEXT,
    resource_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. INTERVIEW_QUESTION
CREATE TABLE interview_question (
    question_id SERIAL PRIMARY KEY,
    company_id INT REFERENCES company(company_id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
);

-- 9. MOCK_INTERVIEW_ATTEMPT
CREATE TABLE mock_interview_attempt (
    attempt_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    company_id INT REFERENCES company(company_id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    total_score NUMERIC(5, 2) DEFAULT 0.00
);

-- 10. INTERVIEW_RESPONSE
CREATE TABLE interview_response (
    response_id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL REFERENCES mock_interview_attempt(attempt_id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES interview_question(question_id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    score NUMERIC(5, 2) DEFAULT 0.00
);

-- 11. APTITUDE_TEST
CREATE TABLE aptitude_test (
    test_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 15,
    difficulty VARCHAR(50) DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard'))
);

-- 12. APTITUDE_QUESTION
CREATE TABLE aptitude_question (
    question_id SERIAL PRIMARY KEY,
    test_id INT NOT NULL REFERENCES aptitude_test(test_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D')),
    marks INT DEFAULT 1
);

-- 13. APTITUDE_ATTEMPT
CREATE TABLE aptitude_attempt (
    attempt_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    test_id INT NOT NULL REFERENCES aptitude_test(test_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    score NUMERIC(5, 2) DEFAULT 0.00
);

-- 14. APTITUDE_ANSWER
CREATE TABLE aptitude_answer (
    answer_id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL REFERENCES aptitude_attempt(attempt_id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES aptitude_question(question_id) ON DELETE CASCADE,
    selected_option CHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D')),
    is_correct BOOLEAN DEFAULT FALSE,
    marks_obtained INT DEFAULT 0
);

-- 15. RECOMMENDATION
CREATE TABLE recommendation (
    recommendation_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    topic VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    recommendation_type VARCHAR(100) NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Dismissed', 'Completed'))
);