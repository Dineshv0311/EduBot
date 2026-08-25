import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Loader2,
  Award
} from 'lucide-react';

interface Company {
  company_id: number;
  company_name: string;
  industry: string;
  description: string;
  question_count: number;
}

interface InterviewQuestion {
  question_id: number;
  company_id: number;
  question_text: string;
  category: string;
  difficulty: string;
}

interface AptitudeTest {
  test_id: number;
  title: string;
  description: string;
  duration_minutes: number;
  difficulty: string;
  total_questions: number;
  total_marks: number;
}

interface AptitudeQuestion {
  question_id: number;
  test_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
}

export default function PracticeHub(): React.JSX.Element {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'interview' | 'aptitude' | 'history'>('interview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock Interview State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([]);
  const [interviewAttemptId, setInterviewAttemptId] = useState<number | null>(null);
  const [interviewAnswers, setInterviewAnswers] = useState<Record<number, string>>({});
  const [interviewResult, setInterviewResult] = useState<{ total_score: number } | null>(null);
  const [interviewSubmitting, setInterviewSubmitting] = useState(false);

  // Aptitude Test State
  const [aptitudeTests, setAptitudeTests] = useState<AptitudeTest[]>([]);
  const [activeTest, setActiveTest] = useState<AptitudeTest | null>(null);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([]);
  const [aptitudeAttemptId, setAptitudeAttemptId] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [testResult, setTestResult] = useState<{
    score_percentage: number;
    total_marks_obtained: number;
    max_marks: number;
    breakdown: any[];
  } | null>(null);
  const [aptitudeSubmitting, setAptitudeSubmitting] = useState(false);

  // History State
  const [interviewHistory, setInterviewHistory] = useState<any[]>([]);
  const [aptitudeHistory, setAptitudeHistory] = useState<any[]>([]);

  const isAutoSubmittingRef = useRef(false);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, testsRes] = await Promise.all([
        fetch('http://localhost:5000/api/mock-interview/companies', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/aptitude/tests', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const compData = await compRes.json();
      const testsData = await testsRes.json();

      setCompanies(compData.companies || []);
      setAptitudeTests(testsData.tests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const [iRes, aRes] = await Promise.all([
        fetch('http://localhost:5000/api/mock-interview/history', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/aptitude/history', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const iData = await iRes.json();
      const aData = await aRes.json();
      setInterviewHistory(iData.history || []);
      setAptitudeHistory(aData.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const startInterview = async (company: Company) => {
    setError(null);
    setLoading(true);
    try {
      const [qRes, startRes] = await Promise.all([
        fetch(`http://localhost:5000/api/mock-interview/questions/${company.company_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/mock-interview/attempt/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ company_id: company.company_id })
        })
      ]);

      const qData = await qRes.json();
      const startData = await startRes.json();

      setSelectedCompany(company);
      setInterviewQuestions(qData.questions || []);
      setInterviewAttemptId(startData.attempt.attempt_id);
      setInterviewAnswers({});
      setInterviewResult(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitInterview = async () => {
    if (!interviewAttemptId) return;
    setInterviewSubmitting(true);
    try {
      const responses = interviewQuestions.map((q) => ({
        question_id: q.question_id,
        answer_text: interviewAnswers[q.question_id] || ''
      }));

      const res = await fetch(`http://localhost:5000/api/mock-interview/attempt/${interviewAttemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ responses })
      });

      const data = await res.json();
      if (res.ok) {
        setInterviewResult({ total_score: data.total_score });
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setInterviewSubmitting(false);
    }
  };

  const startAptitudeTest = async (test: AptitudeTest) => {
    setError(null);
    setLoading(true);
    try {
      const [testDetailsRes, startRes] = await Promise.all([
        fetch(`http://localhost:5000/api/aptitude/test/${test.test_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/aptitude/attempt/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ test_id: test.test_id })
        })
      ]);

      const testDetails = await testDetailsRes.json();
      const startData = await startRes.json();

      setActiveTest(test);
      setAptitudeQuestions(testDetails.questions || []);
      setAptitudeAttemptId(startData.attempt.attempt_id);
      setSelectedOptions({});
      setTestResult(null);
      setTimeRemaining(test.duration_minutes * 60);
      isAutoSubmittingRef.current = false;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAptitudeTest = async () => {
    if (!aptitudeAttemptId || aptitudeSubmitting || isAutoSubmittingRef.current) return;
    isAutoSubmittingRef.current = true;
    setAptitudeSubmitting(true);

    try {
      const answers = aptitudeQuestions.map((q) => ({
        question_id: q.question_id,
        selected_option: selectedOptions[q.question_id] || null
      }));

      const res = await fetch(`http://localhost:5000/api/aptitude/attempt/${aptitudeAttemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answers })
      });

      const data = await res.json();
      if (res.ok) {
        setTestResult(data);
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAptitudeSubmitting(false);
    }
  };

  useEffect(() => {
    if (!activeTest || testResult || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitAptitudeTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, testResult, timeRemaining, aptitudeAttemptId, selectedOptions]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Practice Module...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Sub Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('interview');
              setSelectedCompany(null);
              setInterviewResult(null);
            }}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === 'interview' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mock Interview
          </button>
          <button
            onClick={() => {
              setActiveTab('aptitude');
              setActiveTest(null);
              setTestResult(null);
            }}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === 'aptitude' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aptitude Practice
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-md transition ${
              activeTab === 'history' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attempt History
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Mock Interview */}
      {activeTab === 'interview' && (
        <div>
          {!selectedCompany ? (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Company-Specific Interview Tracks</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select a company track to practice real technical & behavioral questions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((comp) => (
                  <div
                    key={comp.company_id}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-500 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {comp.industry}
                        </span>
                        <span className="text-xs text-slate-500">{comp.question_count} Questions</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{comp.company_name}</h3>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">{comp.description}</p>
                    </div>

                    <button
                      onClick={() => startInterview(comp)}
                      className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Mock Interview</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : interviewResult ? (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Interview Completed!</h2>
              <p className="text-sm text-slate-500 mt-1">Track: {selectedCompany.company_name}</p>

              <div className="my-6 p-6 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Overall Performance Score</p>
                <p className="text-4xl font-extrabold text-indigo-600 mt-2">{interviewResult.total_score} / 100</p>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
                >
                  Choose Another Company
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedCompany.company_name} Mock Interview</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{interviewQuestions.length} Questions in this session</p>
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Cancel Session
                </button>
              </div>

              {interviewQuestions.map((q, idx) => (
                <div key={q.question_id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 uppercase">Question {idx + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {q.category} • {q.difficulty}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{q.question_text}</p>
                  <textarea
                    rows={4}
                    placeholder="Type your comprehensive response here..."
                    value={interviewAnswers[q.question_id] || ''}
                    onChange={(e) =>
                      setInterviewAnswers({ ...interviewAnswers, [q.question_id]: e.target.value })
                    }
                    className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}

              <button
                onClick={submitInterview}
                disabled={interviewSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {interviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Submit Interview Responses</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Aptitude Practice */}
      {activeTab === 'aptitude' && (
        <div>
          {!activeTest ? (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Placement Aptitude Tests</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Timed speed assessments covering quantitative, logical, and verbal aptitude.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aptitudeTests.map((t) => (
                  <div
                    key={t.test_id}
                    className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-500 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {t.difficulty}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {t.duration_minutes} Mins
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{t.title}</h3>
                      <p className="text-xs text-slate-600 mt-2">{t.description}</p>
                      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-slate-500">
                        <span>{t.total_questions} Questions</span>
                        <span>{t.total_marks} Marks</span>
                      </div>
                    </div>

                    <button
                      onClick={() => startAptitudeTest(t)}
                      className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Timed Test</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : testResult ? (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-md">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Assessment Result</h2>
                <p className="text-sm text-slate-500 mt-1">{activeTest.title}</p>

                <div className="my-6 p-6 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Marks Scored</p>
                    <p className="text-3xl font-extrabold text-slate-900 mt-1">
                      {testResult.total_marks_obtained} / {testResult.max_marks}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Score Percentage</p>
                    <p className="text-3xl font-extrabold text-indigo-600 mt-1">
                      {testResult.score_percentage}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="text-xs font-bold uppercase text-slate-600 tracking-wider">Answer Review</h3>
                {testResult.breakdown.map((item, idx) => (
                  <div
                    key={item.question_id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      item.is_correct ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.is_correct ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                      <span>Question {idx + 1}</span>
                    </div>
                    <div>
                      <span>Selected: <strong>{item.selected_option || 'None'}</strong></span> |{' '}
                      <span>Correct: <strong>{item.correct_option}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setActiveTest(null);
                  setTestResult(null);
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
              >
                Return to Tests
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs sticky top-20 z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{activeTest.title}</h2>
                  <p className="text-xs text-slate-500">Answer all questions before timer expires</p>
                </div>
                <div
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono font-bold text-sm ${
                    timeRemaining < 60
                      ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{formatTimer(timeRemaining)}</span>
                </div>
              </div>

              {aptitudeQuestions.map((q, idx) => (
                <div key={q.question_id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-600 uppercase">Question {idx + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {q.marks} Mark(s)
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{q.question_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const optText =
                        optKey === 'A' ? q.option_a : optKey === 'B' ? q.option_b : optKey === 'C' ? q.option_c : q.option_d;
                      const isSelected = selectedOptions[q.question_id] === optKey;

                      return (
                        <button
                          key={optKey}
                          type="button"
                          onClick={() => setSelectedOptions({ ...selectedOptions, [q.question_id]: optKey })}
                          className={`p-3 text-left rounded-lg border text-xs font-medium transition flex items-center gap-2 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected ? 'bg-white text-indigo-600' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {optKey}
                          </span>
                          <span>{optText}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button
                onClick={submitAptitudeTest}
                disabled={aptitudeSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {aptitudeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Submit Aptitude Test</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Mock Interview Records</h3>
            </div>

            {interviewHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No interview attempts recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {interviewHistory.map((h) => (
                  <div key={h.attempt_id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{h.company_name || 'General Track'}</p>
                      <p className="text-slate-500 mt-0.5">{new Date(h.completed_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                      {h.total_score} / 100
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Aptitude Test Records</h3>
            </div>

            {aptitudeHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No aptitude tests completed yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {aptitudeHistory.map((h) => (
                  <div key={h.attempt_id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{h.test_title}</p>
                      <p className="text-slate-500 mt-0.5">{new Date(h.completed_at).toLocaleDateString()}</p>
                    </div>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      {h.score}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}