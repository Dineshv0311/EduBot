import API_BASE_URL from './api';

export interface CodingProblemSummary {
  problem_id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  status: 'Draft' | 'Published' | 'Archived';
  created_at: string;
  total_test_cases: number;
  sample_test_cases: number;
  hidden_test_cases?: number;
  total_submissions?: number;
  is_solved?: boolean;
  latest_verdict?: string | null;
}

export interface TestCase {
  test_case_id: number;
  problem_id?: number;
  input: string;
  expected_output: string;
  is_sample: boolean;
  description?: string;
  order_index?: number;
}

export interface CodingProblemDetail {
  problem_id: number;
  title: string;
  slug: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  example_input?: string;
  example_output?: string;
  example_explanation?: string;
  supported_languages: string[];
  starter_code: Record<string, string>;
  time_limit_ms: number;
  memory_limit_kb: number;
  status: 'Draft' | 'Published' | 'Archived';
  created_at: string;
}

export interface TestCaseEvaluation {
  testCaseId: number;
  isSample: boolean;
  status: 'Passed' | 'Failed' | 'Error' | 'Timeout';
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  executionTime: number;
  memoryUsed: number;
  errorMessage?: string;
}

export interface ExecutionResponse {
  type?: 'sample_run' | 'custom';
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Internal Error';
  passedCount: number;
  totalCount: number;
  totalTime: number;
  evaluations?: TestCaseEvaluation[];
  isFirstTimeSolved?: boolean;
  submissionId?: number;
  error?: string;
}

export interface SubmissionHistoryItem {
  submission_id: number;
  problem_id: number;
  language: string;
  verdict: string;
  passed_count: number;
  total_count: number;
  execution_time: number;
  memory_used: number;
  submitted_at: string;
}

// Student APIs
export async function getPublishedProblems(
  token: string,
  filters?: { topic?: string; difficulty?: string; search?: string }
): Promise<CodingProblemSummary[]> {
  const params = new URLSearchParams();
  if (filters?.topic && filters.topic !== 'All') params.append('topic', filters.topic);
  if (filters?.difficulty && filters.difficulty !== 'All') params.append('difficulty', filters.difficulty);
  if (filters?.search) params.append('search', filters.search);

  const res = await fetch(`${API_BASE_URL}/coding-problems?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch coding problems');
  const data = await res.json();
  return data.problems || [];
}

export async function getProblemDetail(
  idOrSlug: string | number,
  token: string
): Promise<{ problem: CodingProblemDetail; sampleTestCases: TestCase[] }> {
  const res = await fetch(`${API_BASE_URL}/coding-problems/${idOrSlug}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to load problem details');
  }
  return res.json();
}

export async function runCodeSample(
  problemId: number,
  sourceCode: string,
  language: string,
  token: string,
  customInput?: string
): Promise<ExecutionResponse> {
  const res = await fetch(`${API_BASE_URL}/coding-problems/${problemId}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      source_code: sourceCode,
      language,
      custom_input: customInput
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to run code');
  return data;
}

export async function submitProblemSolution(
  problemId: number,
  sourceCode: string,
  language: string,
  token: string
): Promise<ExecutionResponse> {
  const res = await fetch(`${API_BASE_URL}/coding-problems/${problemId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      source_code: sourceCode,
      language
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit solution');
  return data;
}

export async function getProblemSubmissions(
  problemId: number,
  token: string
): Promise<SubmissionHistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/coding-problems/${problemId}/submissions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch submissions');
  const data = await res.json();
  return data.submissions || [];
}

// Admin APIs
export async function getAdminCodingProblems(token: string): Promise<CodingProblemSummary[]> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch admin coding problems');
  const data = await res.json();
  return data.problems || [];
}

export async function createAdminCodingProblem(
  problemData: Partial<CodingProblemDetail>,
  token: string
): Promise<CodingProblemDetail> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(problemData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create problem');
  return data.problem;
}

export async function updateAdminCodingProblem(
  problemId: number,
  problemData: Partial<CodingProblemDetail>,
  token: string
): Promise<CodingProblemDetail> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${problemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(problemData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update problem');
  return data.problem;
}

export async function deleteAdminCodingProblem(
  problemId: number,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${problemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete problem');
  }
}

export async function updateProblemStatus(
  problemId: number,
  status: 'Draft' | 'Published' | 'Archived',
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${problemId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update problem status');
  }
}

export async function getProblemTestCases(
  problemId: number,
  token: string
): Promise<TestCase[]> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${problemId}/test-cases`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch test cases');
  const data = await res.json();
  return data.testCases || [];
}

export async function addTestCase(
  problemId: number,
  testCase: { input: string; expected_output: string; is_sample: boolean; description?: string; order_index?: number },
  token: string
): Promise<TestCase> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${problemId}/test-cases`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(testCase)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add test case');
  return data.testCase;
}

export async function deleteTestCase(
  testCaseId: number,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/admin/coding-test-cases/${testCaseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete test case');
}
