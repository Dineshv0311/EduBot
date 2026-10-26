import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Internal Error';
  executionTime: number; // in seconds
  memoryUsed: number; // in KB
  error?: string;
}

export interface TestCaseEvaluation {
  testCaseId: number;
  isSample: boolean;
  status: 'Passed' | 'Failed' | 'Error' | 'Timeout';
  input: string;
  expectedOutput: string;
  actualOutput?: string; // only provided if isSample is true or in admin mode
  executionTime: number;
  memoryUsed: number;
  errorMessage?: string;
}

// Judge0 Language IDs
const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
  python: 71, // Python (3.8.1)
  python3: 71,
  javascript: 63, // JavaScript (Node.js 12.14.0)
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62 // Java (OpenJDK 13.0.1)
};

/**
 * Normalizes output string for deterministic comparison:
 * - Replaces \r\n with \n
 * - Trims trailing whitespace from each line
 * - Trims leading and trailing empty lines
 */
export function normalizeOutput(str: string): string {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Executes Python code locally in an isolated child process with timeout and input pipe
 */
async function executeLocalPython(
  code: string,
  stdin: string,
  timeoutMs: number = 3000
): Promise<{ stdout: string; stderr: string; time: number; exitCode: number | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const tempDir = path.join(os.tmpdir(), 'edubot_exec_' + Math.random().toString(36).substring(2, 9));
    fs.mkdirSync(tempDir, { recursive: true });
    const scriptPath = path.join(tempDir, 'solution.py');
    fs.writeFileSync(scriptPath, code, 'utf8');

    // Run python with unbuffered output (-u) and isolated mode (-I)
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    let timedOut = false;

    const child = spawn(pythonCmd, ['-u', '-I', scriptPath], {
      cwd: tempDir,
      env: {
        PYTHONIOENCODING: 'utf-8',
        PYTHONDONTWRITEBYTECODE: '1'
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // process might have already exited
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf8');
      if (stdoutData.length > 50000) {
        // Output limit: 50KB to prevent memory exhaustion
        child.kill();
      }
    });

    child.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf8');
      if (stderrData.length > 20000) {
        child.kill();
      }
    });

    // Write standard input and close stream
    try {
      if (stdin) {
        child.stdin.write(stdin);
      }
      child.stdin.end();
    } catch {
      // stdin already closed
    }

    child.on('close', (code) => {
      clearTimeout(timer);
      const executionTime = (performance.now() - startTime) / 1000;

      // Clean up temporary script
      try {
        fs.unlinkSync(scriptPath);
        fs.rmdirSync(tempDir);
      } catch {
        // ignore cleanup error
      }

      resolve({
        stdout: stdoutData,
        stderr: stderrData,
        time: parseFloat(executionTime.toFixed(3)),
        exitCode: code,
        timedOut
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const executionTime = (performance.now() - startTime) / 1000;
      try {
        fs.unlinkSync(scriptPath);
        fs.rmdirSync(tempDir);
      } catch {
        // ignore
      }
      resolve({
        stdout: stdoutData,
        stderr: err.message,
        time: parseFloat(executionTime.toFixed(3)),
        exitCode: -1,
        timedOut: false
      });
    });
  });
}

/**
 * Executes code using Judge0 CE or falls back to local sandboxed runner
 */
export async function executeCode(
  sourceCode: string,
  stdin: string,
  language: string = 'python',
  timeLimitMs: number = 3000
): Promise<ExecutionResult> {
  const judge0Url = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
  const judge0Key = process.env.JUDGE0_API_KEY;
  const langId = JUDGE0_LANGUAGE_IDS[language.toLowerCase()] || 71;

  // In unit test environment, bypass external network calls and use local runner
  if (process.env.NODE_ENV === 'test' && language.toLowerCase().includes('python')) {
    const localRes = await executeLocalPython(sourceCode, stdin, timeLimitMs);
    if (localRes.timedOut) {
      return {
        stdout: '',
        stderr: 'Time Limit Exceeded',
        status: 'Time Limit Exceeded',
        executionTime: localRes.time,
        memoryUsed: 0,
        error: 'Execution timed out'
      };
    }
    if (localRes.exitCode !== 0 || localRes.stderr.trim().length > 0) {
      return {
        stdout: localRes.stdout,
        stderr: localRes.stderr,
        status: 'Runtime Error',
        executionTime: localRes.time,
        memoryUsed: 0,
        error: localRes.stderr.trim()
      };
    }
    return {
      stdout: localRes.stdout,
      stderr: '',
      status: 'Accepted',
      executionTime: localRes.time,
      memoryUsed: 0
    };
  }

  // 1. Attempt primary: Judge0 CE
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (judge0Key) {
      headers['X-RapidAPI-Key'] = judge0Key;
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    const response = await fetch(`${judge0Url}/submissions?wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: langId,
        stdin: stdin || '',
        cpu_time_limit: Math.max(1, Math.min(10, Math.ceil(timeLimitMs / 1000))),
        memory_limit: 128000
      })
    });

    if (response.ok) {
      const result = await response.json() as any;
      const statusId = result.status?.id;
      const stdout = result.stdout || '';
      const stderr = result.stderr || result.compile_output || '';
      const executionTime = parseFloat(result.time || '0');
      const memoryUsed = parseInt(result.memory || '0', 10);

      // Status 3: Accepted (execution finished without runtime error)
      // Status 4: Wrong Answer (if judge compared output, but we compare ourselves)
      // Status 5: Time Limit Exceeded
      // Status 6: Compilation Error
      // Status 7-12: Runtime Error / Signal
      let status: ExecutionResult['status'] = 'Accepted';
      if (statusId === 5) {
        status = 'Time Limit Exceeded';
      } else if (statusId === 6) {
        status = 'Runtime Error';
      } else if (statusId >= 7 && statusId <= 12) {
        status = 'Runtime Error';
      } else if (stderr && stderr.trim().length > 0 && !stdout) {
        status = 'Runtime Error';
      }

      return {
        stdout,
        stderr,
        status,
        executionTime,
        memoryUsed,
        error: stderr || undefined
      };
    }
  } catch {
    // Judge0 unreachable or network error, fallback to local isolated runner
  }

  // 2. Secondary fallback: Local sandboxed Python process
  if (language.toLowerCase().includes('python')) {
    const localRes = await executeLocalPython(sourceCode, stdin, timeLimitMs);

    if (localRes.timedOut) {
      return {
        stdout: '',
        stderr: 'Time Limit Exceeded (execution exceeded limit)',
        status: 'Time Limit Exceeded',
        executionTime: localRes.time,
        memoryUsed: 0,
        error: 'Execution timed out'
      };
    }

    if (localRes.exitCode !== 0 || localRes.stderr.trim().length > 0) {
      return {
        stdout: localRes.stdout,
        stderr: localRes.stderr,
        status: 'Runtime Error',
        executionTime: localRes.time,
        memoryUsed: 0,
        error: localRes.stderr.trim()
      };
    }

    return {
      stdout: localRes.stdout,
      stderr: '',
      status: 'Accepted',
      executionTime: localRes.time,
      memoryUsed: 0
    };
  }

  return {
    stdout: '',
    stderr: `Language ${language} requires external judge which is currently unavailable.`,
    status: 'Internal Error',
    executionTime: 0,
    memoryUsed: 0,
    error: 'Execution engine unavailable'
  };
}

/**
 * Evaluates code against a suite of test cases
 * Returns overall verdict, counts, and per-test case details
 */
export async function evaluateTestCases(
  sourceCode: string,
  testCases: Array<{
    test_case_id: number;
    input: string;
    expected_output: string;
    is_sample: boolean;
  }>,
  language: string = 'python',
  timeLimitMs: number = 3000,
  isAdmin: boolean = false
): Promise<{
  overallVerdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Internal Error';
  passedCount: number;
  totalCount: number;
  totalTime: number;
  maxMemory: number;
  evaluations: TestCaseEvaluation[];
}> {
  let passedCount = 0;
  let totalTime = 0;
  let maxMemory = 0;
  let overallVerdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Internal Error' = 'Accepted';
  const evaluations: TestCaseEvaluation[] = [];

  for (const tc of testCases) {
    const execResult = await executeCode(sourceCode, tc.input, language, timeLimitMs);
    totalTime += execResult.executionTime;
    if (execResult.memoryUsed > maxMemory) {
      maxMemory = execResult.memoryUsed;
    }

    let tcStatus: TestCaseEvaluation['status'] = 'Failed';

    if (execResult.status === 'Time Limit Exceeded') {
      tcStatus = 'Timeout';
      if (overallVerdict === 'Accepted') overallVerdict = 'Time Limit Exceeded';
    } else if (execResult.status === 'Runtime Error') {
      tcStatus = 'Error';
      if (overallVerdict === 'Accepted') overallVerdict = 'Runtime Error';
    } else if (execResult.status === 'Internal Error') {
      tcStatus = 'Error';
      if (overallVerdict === 'Accepted') overallVerdict = 'Internal Error';
    } else {
      // Compare normalized outputs
      const normalizedActual = normalizeOutput(execResult.stdout);
      const normalizedExpected = normalizeOutput(tc.expected_output);

      if (normalizedActual === normalizedExpected) {
        tcStatus = 'Passed';
        passedCount++;
      } else {
        tcStatus = 'Failed';
        if (overallVerdict === 'Accepted') overallVerdict = 'Wrong Answer';
      }
    }

    const evalItem: TestCaseEvaluation = {
      testCaseId: tc.test_case_id,
      isSample: tc.is_sample,
      status: tcStatus,
      input: tc.is_sample || isAdmin ? tc.input : '',
      expectedOutput: tc.is_sample || isAdmin ? tc.expected_output : '',
      executionTime: execResult.executionTime,
      memoryUsed: execResult.memoryUsed
    };

    // Only expose actual output and error message for sample test cases (or for admin)
    if (tc.is_sample || isAdmin) {
      evalItem.actualOutput = execResult.stdout;
      if (execResult.error) {
        evalItem.errorMessage = execResult.error;
      }
    }

    evaluations.push(evalItem);
  }

  return {
    overallVerdict,
    passedCount,
    totalCount: testCases.length,
    totalTime: parseFloat(totalTime.toFixed(3)),
    maxMemory,
    evaluations
  };
}
