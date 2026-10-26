import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import {
  getProblemDetail,
  runCodeSample,
  submitProblemSolution,
  getProblemSubmissions,
  CodingProblemDetail,
  TestCase,
  ExecutionResponse,
  SubmissionHistoryItem
} from '../services/codingProblemsService';
import {
  ArrowLeft,
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Code2,
  FileText,
  History,
  Terminal,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function CodingWorkspace(): React.JSX.Element {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<CodingProblemDetail | null>(null);
  const [sampleTestCases, setSampleTestCases] = useState<TestCase[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [activeLeftTab, setActiveLeftTab] = useState<'description' | 'submissions'>('description');
  const [activeRightTab, setActiveRightTab] = useState<'testcases' | 'result'>('testcases');
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!idOrSlug || !token) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getProblemDetail(idOrSlug, token);
        setProblem(data.problem);
        setSampleTestCases(data.sampleTestCases || []);

        // Set starter code
        const starter = data.problem.starter_code?.python ||
          'import sys\n\ndef solve():\n    # Read input from standard input\n    input_data = sys.stdin.read().split()\n    if not input_data:\n        return\n    # Your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()\n';
        setCode(starter);

        // Load submission history
        const subs = await getProblemSubmissions(data.problem.problem_id, token);
        setSubmissions(subs);
      } catch (err: any) {
        setError(err.message || 'Failed to load coding problem');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [idOrSlug, token]);

  const handleResetCode = () => {
    if (!problem) return;
    if (window.confirm('Reset code to the original starter template? Any unsaved edits will be lost.')) {
      const starter = problem.starter_code?.python || '# Write your solution here\n';
      setCode(starter);
    }
  };

  const handleRunCode = async () => {
    if (!problem || !token || isRunning || isSubmitting) return;

    setIsRunning(true);
    setActiveRightTab('result');
    try {
      const result = await runCodeSample(problem.problem_id, code, selectedLanguage, token);
      setExecutionResult(result);
    } catch (err: any) {
      setExecutionResult({
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: sampleTestCases.length,
        totalTime: 0,
        error: err.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!problem || !token || isRunning || isSubmitting) return;

    setIsSubmitting(true);
    setActiveRightTab('result');
    try {
      const result = await submitProblemSolution(problem.problem_id, code, selectedLanguage, token);
      setExecutionResult(result);

      if (result.verdict === 'Accepted') {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 5000);
      }

      // Refresh submissions list
      const subs = await getProblemSubmissions(problem.problem_id, token);
      setSubmissions(subs);
    } catch (err: any) {
      setExecutionResult({
        verdict: 'Runtime Error',
        passedCount: 0,
        totalCount: sampleTestCases.length,
        totalTime: 0,
        error: err.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <Loader2 className="w-9 h-9 animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Preparing Coding Workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Problem Not Available</h2>
          <p className="text-xs text-slate-600 mb-6">{error || 'This problem does not exist or has not been published yet.'}</p>
          <button
            onClick={() => navigate('/coding')}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            Back to Coding Tracker
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/coding"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Problem List</span>
          </Link>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-bold text-white tracking-tight">{problem.title}</h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                problem.difficulty === 'Easy'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : problem.difficulty === 'Medium'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {problem.difficulty}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {problem.topic}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 text-[11px]">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="python" className="bg-slate-900 text-white">Python 3 (3.10)</option>
              <option value="cpp" disabled className="bg-slate-900 text-slate-500">C++ (Coming soon)</option>
              <option value="java" disabled className="bg-slate-900 text-slate-500">Java (Coming soon)</option>
            </select>
          </div>

          <button
            onClick={handleResetCode}
            title="Reset code template"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>Run Code</span>
          </button>

          <button
            onClick={handleSubmitSolution}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Submit Solution</span>
          </button>
        </div>
      </header>

      {/* Accepted Celebration Banner */}
      {showCelebration && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-xs font-bold shadow-md animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" />
          <span>🎉 Problem Solved! All test cases passed. Your Coding Tracker progress has been updated!</span>
        </div>
      )}

      {/* Main Workspace Split-Pane */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Pane: Problem Description & Submissions */}
        <div className="lg:col-span-5 border-r border-slate-800 bg-slate-900/70 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-800 bg-slate-900 px-4 shrink-0">
            <button
              onClick={() => setActiveLeftTab('description')}
              className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition ${
                activeLeftTab === 'description'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Description</span>
            </button>

            <button
              onClick={() => setActiveLeftTab('submissions')}
              className={`flex items-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition ${
                activeLeftTab === 'submissions'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Submissions ({submissions.length})</span>
            </button>
          </div>

          {/* Left Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300 leading-relaxed">
            {activeLeftTab === 'description' ? (
              <>
                <div>
                  <h2 className="text-base font-bold text-white mb-2">{problem.title}</h2>
                  <div className="prose prose-invert prose-xs max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {problem.description}
                  </div>
                </div>

                {/* Examples */}
                {problem.example_input && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">Example</h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px] mb-0.5">Input:</span>
                        <pre className="bg-slate-900 p-2 rounded text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {problem.example_input}
                        </pre>
                      </div>

                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px] mb-0.5">Output:</span>
                        <pre className="bg-slate-900 p-2 rounded text-indigo-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                          {problem.example_output}
                        </pre>
                      </div>

                      {problem.example_explanation && (
                        <div>
                          <span className="text-slate-500 font-semibold block text-[11px] mb-0.5">Explanation:</span>
                          <p className="text-slate-400 text-xs italic">{problem.example_explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {problem.constraints && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">Constraints</h3>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 font-mono text-[11px] whitespace-pre-wrap">
                      {problem.constraints}
                    </div>
                  </div>
                )}

                {/* Input / Output Formats */}
                {(problem.input_format || problem.output_format) && (
                  <div className="space-y-3">
                    {problem.input_format && (
                      <div>
                        <h4 className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">Input Format</h4>
                        <p className="text-slate-300 whitespace-pre-wrap">{problem.input_format}</p>
                      </div>
                    )}
                    {problem.output_format && (
                      <div>
                        <h4 className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">Output Format</h4>
                        <p className="text-slate-300 whitespace-pre-wrap">{problem.output_format}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Submissions History */
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm mb-3">Your Past Submissions</h3>
                {submissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No submissions recorded for this problem yet. Click "Submit Solution" to evaluate!
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {submissions.map((sub) => (
                      <div
                        key={sub.submission_id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-3">
                          {sub.verdict === 'Accepted' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <span
                              className={`font-bold text-xs ${
                                sub.verdict === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {sub.verdict}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>{sub.language}</span>
                              <span>•</span>
                              <span>{new Date(sub.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          <span className="text-slate-300 font-mono">
                            {sub.passed_count}/{sub.total_count} Passed
                          </span>
                          <span className="block text-slate-500 text-[10px]">{sub.execution_time}s</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor + Test Results */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950 overflow-hidden">
          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[360px] relative border-b border-slate-800">
            <Editor
              height="100%"
              language={selectedLanguage}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                fontSize: 13,
                fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                lineNumbers: 'on',
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* Bottom Execution Panel */}
          <div className="h-64 flex flex-col bg-slate-900 border-t border-slate-800 shrink-0 overflow-hidden">
            {/* Bottom Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 bg-slate-900 shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveRightTab('testcases')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    activeRightTab === 'testcases'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Test Cases</span>
                </button>

                <button
                  onClick={() => setActiveRightTab('result')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition ${
                    activeRightTab === 'result'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Execution Result</span>
                  {executionResult && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        executionResult.verdict === 'Accepted' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                  )}
                </button>
              </div>

              {(isRunning || isSubmitting) && (
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isRunning ? 'Running code...' : 'Judging submission...'}</span>
                </div>
              )}
            </div>

            {/* Bottom Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 text-xs">
              {activeRightTab === 'testcases' ? (
                /* Sample Cases Tabs */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {sampleTestCases.map((tc, idx) => (
                      <button
                        key={tc.test_case_id}
                        onClick={() => setSelectedCaseIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                          selectedCaseIndex === idx
                            ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Case {idx + 1}
                      </button>
                    ))}
                  </div>

                  {sampleTestCases[selectedCaseIndex] && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-500 text-[11px] font-semibold block mb-1">Standard Input:</span>
                        <pre className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-slate-200 font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {sampleTestCases[selectedCaseIndex].input}
                        </pre>
                      </div>

                      <div>
                        <span className="text-slate-500 text-[11px] font-semibold block mb-1">Expected Output:</span>
                        <pre className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-emerald-400 font-mono text-[11px] whitespace-pre-wrap max-h-36 overflow-y-auto">
                          {sampleTestCases[selectedCaseIndex].expected_output}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Result Panel */
                <div>
                  {!executionResult ? (
                    <div className="h-full flex items-center justify-center text-slate-500 p-8 text-center">
                      Run your code or submit your solution to view evaluation results here.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Verdict Header */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center gap-2.5">
                          {executionResult.verdict === 'Accepted' ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-rose-400" />
                          )}
                          <div>
                            <span
                              className={`text-sm font-bold ${
                                executionResult.verdict === 'Accepted' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {executionResult.verdict}
                            </span>
                            <span className="block text-[11px] text-slate-400">
                              {executionResult.passedCount} / {executionResult.totalCount} test cases passed
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-400 font-mono">
                          <span className="flex items-center gap-1 justify-end">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {executionResult.totalTime}s
                          </span>
                        </div>
                      </div>

                      {/* Error display if any */}
                      {executionResult.error && (
                        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 font-mono text-[11px] whitespace-pre-wrap">
                          {executionResult.error}
                        </div>
                      )}

                      {/* Per-case breakdown if available */}
                      {executionResult.evaluations && executionResult.evaluations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Test Case Breakdown</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {executionResult.evaluations.map((ev, idx) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                  ev.status === 'Passed'
                                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                                    : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                                }`}
                              >
                                <span className="font-semibold">
                                  {ev.isSample ? `Sample Case ${idx + 1}` : `Hidden Case ${idx + 1}`}
                                </span>
                                <span className="text-[11px] font-bold uppercase">{ev.status}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
