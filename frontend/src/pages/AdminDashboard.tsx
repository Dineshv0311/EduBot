import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogOut,
  Building2,
  HelpCircle,
  Brain,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Code2,
  Terminal
} from 'lucide-react';
import API_BASE_URL from '../services/api';

export default function AdminDashboard(): React.JSX.Element {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'questions' | 'aptitude' | 'coding'>('companies');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [companies, setCompanies] = useState<any[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [aptitudeTests, setAptitudeTests] = useState<any[]>([]);
  const [codingProblems, setCodingProblems] = useState<any[]>([]);

  // Company Form
  const [compName, setCompName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compWebsite, setCompWebsite] = useState('');

  // Interview Question Form
  const [iqCompanyId, setIqCompanyId] = useState('');
  const [iqText, setIqText] = useState('');
  const [iqCategory, setIqCategory] = useState('Technical');
  const [iqDifficulty, setIqDifficulty] = useState('Medium');

  // Aptitude Test Form
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testDuration, setTestDuration] = useState('15');
  const [testDifficulty, setTestDifficulty] = useState('Medium');

  // Aptitude Question Form
  const [selectedTestForQuestions, setSelectedTestForQuestions] = useState<any | null>(null);
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [aqText, setAqText] = useState('');
  const [aqA, setAqA] = useState('');
  const [aqB, setAqB] = useState('');
  const [aqC, setAqC] = useState('');
  const [aqD, setAqD] = useState('');
  const [aqCorrect, setAqCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [aqMarks, setAqMarks] = useState('1');

  // Coding Problem Form
  const [cpTitle, setCpTitle] = useState('');
  const [cpSlug, setCpSlug] = useState('');
  const [cpTopic, setCpTopic] = useState('Arrays');
  const [cpDifficulty, setCpDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [cpDesc, setCpDesc] = useState('');
  const [cpInputFormat, setCpInputFormat] = useState('');
  const [cpOutputFormat, setCpOutputFormat] = useState('');
  const [cpConstraints, setCpConstraints] = useState('');
  const [cpExInput, setCpExInput] = useState('');
  const [cpExOutput, setCpExOutput] = useState('');
  const [cpExExplanation, setCpExExplanation] = useState('');
  const [cpStatus, setCpStatus] = useState<'Draft' | 'Published'>('Published');

  // Test Case Management for selected coding problem
  const [selectedProblemForTC, setSelectedProblemForTC] = useState<any | null>(null);
  const [problemTestCases, setProblemTestCases] = useState<any[]>([]);
  const [tcInput, setTcInput] = useState('');
  const [tcOutput, setTcOutput] = useState('');
  const [tcIsSample, setTcIsSample] = useState(true);
  const [tcDesc, setTcDesc] = useState('');

  const fetchAllAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, iqRes, aptRes, cpRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/companies`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/interview-questions`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/aptitude-tests`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/admin/coding-problems`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const compData = await compRes.json();
      const iqData = await iqRes.json();
      const aptData = await aptRes.json();
      const cpData = await cpRes.json();

      setCompanies(compData.companies || []);
      setInterviewQuestions(iqData.questions || []);
      setAptitudeTests(aptData.tests || []);
      setCodingProblems(cpData.problems || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, [token]);

  // Handle Company Create & Delete
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ company_name: compName, industry: compIndustry, description: compDesc, website: compWebsite })
      });
      if (res.ok) {
        setCompName('');
        setCompIndustry('');
        setCompDesc('');
        setCompWebsite('');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCompany = async (id: number) => {
    if (!window.confirm('Delete this company and its associated interview questions?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/companies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Interview Question Create & Delete
  const handleCreateIQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/interview-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          company_id: iqCompanyId ? parseInt(iqCompanyId, 10) : null,
          question_text: iqText,
          category: iqCategory,
          difficulty: iqDifficulty
        })
      });
      if (res.ok) {
        setIqText('');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteIQ = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/interview-questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Aptitude Test Create & Delete
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/admin/aptitude-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: testTitle,
          description: testDesc,
          duration_minutes: parseInt(testDuration, 10),
          difficulty: testDifficulty
        })
      });
      if (res.ok) {
        setTestTitle('');
        setTestDesc('');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTest = async (id: number) => {
    if (!window.confirm('Delete this test and all its questions?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/aptitude-tests/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedTestForQuestions?.test_id === id) setSelectedTestForQuestions(null);
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Manage Questions within an Aptitude Test
  const loadTestQuestions = async (test: any) => {
    setSelectedTestForQuestions(test);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/aptitude-questions/${test.test_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTestQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTestForQuestions) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/aptitude-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          test_id: selectedTestForQuestions.test_id,
          question_text: aqText,
          option_a: aqA,
          option_b: aqB,
          option_c: aqC,
          option_d: aqD,
          correct_option: aqCorrect,
          marks: parseInt(aqMarks, 10)
        })
      });
      if (res.ok) {
        setAqText('');
        setAqA('');
        setAqB('');
        setAqC('');
        setAqD('');
        loadTestQuestions(selectedTestForQuestions);
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAQ = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/aptitude-questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && selectedTestForQuestions) {
        loadTestQuestions(selectedTestForQuestions);
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // Coding Problem Operations
  // ==========================================
  const handleCreateCodingProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coding-problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: cpTitle,
          slug: cpSlug || undefined,
          topic: cpTopic,
          difficulty: cpDifficulty,
          description: cpDesc,
          input_format: cpInputFormat,
          output_format: cpOutputFormat,
          constraints: cpConstraints,
          example_input: cpExInput,
          example_output: cpExOutput,
          example_explanation: cpExExplanation,
          status: cpStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create coding problem');

      // Reset form
      setCpTitle('');
      setCpSlug('');
      setCpDesc('');
      setCpInputFormat('');
      setCpOutputFormat('');
      setCpConstraints('');
      setCpExInput('');
      setCpExOutput('');
      setCpExExplanation('');
      fetchAllAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCodingProblem = async (id: number) => {
    if (!window.confirm('Delete this coding problem and all its test cases?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedProblemForTC?.problem_id === id) setSelectedProblemForTC(null);
        fetchAllAdminData();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleProblemStatus = async (problemId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Published' ? 'Draft' : 'Published';
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${problemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update problem status');
      fetchAllAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadProblemTestCases = async (prob: any) => {
    setSelectedProblemForTC(prob);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${prob.problem_id}/test-cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProblemTestCases(data.testCases || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblemForTC) return;
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/coding-problems/${selectedProblemForTC.problem_id}/test-cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          input: tcInput,
          expected_output: tcOutput,
          is_sample: tcIsSample,
          description: tcDesc
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add test case');

      setTcInput('');
      setTcOutput('');
      setTcDesc('');
      loadProblemTestCases(selectedProblemForTC);
      fetchAllAdminData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTestCase = async (testCaseId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/coding-test-cases/${testCaseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok && selectedProblemForTC) {
        loadProblemTestCases(selectedProblemForTC);
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Control Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center text-white font-black text-lg">
              E
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 leading-none">EduBot Control Center</h1>
              <p className="text-xs text-rose-600 font-semibold mt-0.5">Admin Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-600">Logged in as {user?.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('companies')}
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
              activeTab === 'companies'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Companies & Content ({companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('coding')}
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
              activeTab === 'coding'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Coding Problems ({codingProblems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
              activeTab === 'questions'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Interview Question Bank ({interviewQuestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('aptitude')}
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition shrink-0 ${
              activeTab === 'aptitude'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Aptitude Test Bank ({aptitudeTests.length})</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================
            TAB: CODING PROBLEMS MANAGEMENT
           ======================================================== */}
        {activeTab === 'coding' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Create Coding Problem Form */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Terminal className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Create Coding Problem</h3>
                </div>

                <form onSubmit={handleCreateCodingProblem} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Problem Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Two Sum"
                      value={cpTitle}
                      onChange={(e) => setCpTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Topic Category *</label>
                      <select
                        value={cpTopic}
                        onChange={(e) => setCpTopic(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Arrays">Arrays</option>
                        <option value="Strings">Strings</option>
                        <option value="Linked Lists">Linked Lists</option>
                        <option value="Trees & Graphs">Trees & Graphs</option>
                        <option value="Dynamic Programming">Dynamic Programming</option>
                        <option value="Sorting & Searching">Sorting & Searching</option>
                        <option value="Recursion & Backtracking">Recursion & Backtracking</option>
                        <option value="Stack & Queue">Stack & Queue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Difficulty *</label>
                      <select
                        value={cpDifficulty}
                        onChange={(e) => setCpDifficulty(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Problem Statement & Description *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Detailed problem description..."
                      value={cpDesc}
                      onChange={(e) => setCpDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Input Format</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. First line contains N..."
                        value={cpInputFormat}
                        onChange={(e) => setCpInputFormat(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Output Format</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Return space-separated integers..."
                        value={cpOutputFormat}
                        onChange={(e) => setCpOutputFormat(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Constraints</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. 1 <= N <= 10^5"
                      value={cpConstraints}
                      onChange={(e) => setCpConstraints(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Sample Input</label>
                      <textarea
                        rows={2}
                        placeholder="4\n2 7 11 15\n9"
                        value={cpExInput}
                        onChange={(e) => setCpExInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Sample Output</label>
                      <textarea
                        rows={2}
                        placeholder="0 1"
                        value={cpExOutput}
                        onChange={(e) => setCpExOutput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Publication Status</label>
                    <select
                      value={cpStatus}
                      onChange={(e) => setCpStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Published">Published (Students can solve)</option>
                      <option value="Draft">Draft (Admin only)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition mt-2 shadow-xs"
                  >
                    Create Problem
                  </button>
                </form>
              </div>

              {/* Right Column: Existing Problems List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Coding Problems Library ({codingProblems.length})</h3>
                      <p className="text-xs text-slate-500">Manage published challenges and test case suites</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {codingProblems.map((prob) => (
                      <div
                        key={prob.problem_id}
                        className={`p-4 flex items-center justify-between hover:bg-slate-50 transition ${
                          selectedProblemForTC?.problem_id === prob.problem_id ? 'bg-rose-50/50 border-l-4 border-rose-600' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{prob.title}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                                prob.difficulty === 'Easy'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : prob.difficulty === 'Medium'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {prob.difficulty}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                prob.status === 'Published'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {prob.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>Topic: <strong className="text-slate-700">{prob.topic}</strong></span>
                            <span>•</span>
                            <span>Test Cases: <strong className="text-slate-700">{prob.total_test_cases}</strong> ({prob.sample_test_cases} sample, {prob.hidden_test_cases} hidden)</span>
                            <span>•</span>
                            <span>Submissions: <strong className="text-slate-700">{prob.total_submissions || 0}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleProblemStatus(prob.problem_id, prob.status)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                              prob.status === 'Published'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {prob.status === 'Published' ? 'Unpublish' : 'Publish'}
                          </button>

                          <button
                            onClick={() => loadProblemTestCases(prob)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                          >
                            Manage Test Cases
                          </button>

                          <button
                            onClick={() => handleDeleteCodingProblem(prob.problem_id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Test Cases Sub-Panel */}
                {selectedProblemForTC && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Test Cases: {selectedProblemForTC.title} ({problemTestCases.length})
                        </h4>
                        <p className="text-xs text-slate-500">Define sample and hidden test cases for automated evaluation</p>
                      </div>

                      <button
                        onClick={() => setSelectedProblemForTC(null)}
                        className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                      >
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Add Test Case Form */}
                      <form onSubmit={handleCreateTestCase} className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h5 className="font-bold text-slate-800">Add Test Case</h5>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Standard Input *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Input passed to stdin..."
                            value={tcInput}
                            onChange={(e) => setTcInput(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Expected Output *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Exact output printed to stdout..."
                            value={tcOutput}
                            onChange={(e) => setTcOutput(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono text-[11px]"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Visibility Type</label>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                checked={tcIsSample}
                                onChange={() => setTcIsSample(true)}
                              />
                              <span className="font-medium text-emerald-700">Sample (Visible)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                checked={!tcIsSample}
                                onChange={() => setTcIsSample(false)}
                              />
                              <span className="font-medium text-slate-700">Hidden (Private)</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Label / Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Edge case: empty string"
                            value={tcDesc}
                            onChange={(e) => setTcDesc(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded transition"
                        >
                          Add Test Case
                        </button>
                      </form>

                      {/* List Test Cases */}
                      <div className="lg:col-span-2 space-y-2 max-h-96 overflow-y-auto">
                        {problemTestCases.length === 0 ? (
                          <div className="p-6 text-center text-slate-500 text-xs">
                            No test cases added yet. Add at least one test case before publishing.
                          </div>
                        ) : (
                          problemTestCases.map((tc, idx) => (
                            <div key={tc.test_case_id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-start justify-between">
                              <div className="space-y-1 font-mono text-[11px] overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">Case {idx + 1}</span>
                                  <span
                                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                      tc.is_sample
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {tc.is_sample ? 'Sample' : 'Hidden'}
                                  </span>
                                  {tc.description && (
                                    <span className="text-slate-400 font-sans text-[11px] truncate">({tc.description})</span>
                                  )}
                                </div>
                                <div className="text-slate-600 truncate">
                                  Input: <span className="text-slate-800">{tc.input.replace(/\n/g, '↵ ')}</span>
                                </div>
                                <div className="text-emerald-700 truncate">
                                  Expected: <span className="text-emerald-900">{tc.expected_output.replace(/\n/g, '↵ ')}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteTestCase(tc.test_case_id)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition shrink-0 ml-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: COMPANIES & CONTENT
           ======================================================== */}
        {activeTab === 'companies' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Hiring Partner</h3>
              </div>
              <form onSubmit={handleCreateCompany} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Industry Sector *</label>
                  <input
                    type="text"
                    required
                    value={compIndustry}
                    onChange={(e) => setCompIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Overview & Context</label>
                  <textarea
                    rows={3}
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Website</label>
                  <input
                    type="url"
                    value={compWebsite}
                    onChange={(e) => setCompWebsite(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition mt-2 shadow-xs"
                >
                  Register Partner
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm">Active Hiring Partners ({companies.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {companies.map((c) => (
                  <div key={c.company_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{c.company_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                          {c.industry}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{c.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{c.question_count || 0} Interview Prompts</span>
                        <span>•</span>
                        <span>{c.content_count || 0} Prep Resources</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCompany(c.company_id)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: INTERVIEW QUESTIONS
           ======================================================== */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">Add Interview Question</h3>
              </div>
              <form onSubmit={handleCreateIQ} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Association</label>
                  <select
                    value={iqCompanyId}
                    onChange={(e) => setIqCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">General (No Company)</option>
                    {companies.map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Question Prompt *</label>
                  <textarea
                    required
                    rows={3}
                    value={iqText}
                    onChange={(e) => setIqText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={iqCategory}
                      onChange={(e) => setIqCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
                    <select
                      value={iqDifficulty}
                      onChange={(e) => setIqDifficulty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition mt-2 shadow-xs"
                >
                  Add Question
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm">Question Repository ({interviewQuestions.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {interviewQuestions.map((q) => (
                  <div key={q.question_id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900 text-xs">{q.question_text}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {q.company_name || 'General'}
                        </span>
                        <span>•</span>
                        <span>{q.category}</span>
                        <span>•</span>
                        <span className="font-semibold text-rose-600">{q.difficulty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteIQ(q.question_id)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: APTITUDE TESTS
           ======================================================== */}
        {activeTab === 'aptitude' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs h-fit space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Plus className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-slate-900 text-sm">Create Aptitude Assessment</h3>
                </div>
                <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Test Title *</label>
                    <input
                      type="text"
                      required
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={testDesc}
                      onChange={(e) => setTestDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={testDuration}
                        onChange={(e) => setTestDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
                      <select
                        value={testDifficulty}
                        onChange={(e) => setTestDifficulty(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition mt-2 shadow-xs"
                  >
                    Create Assessment
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm">Aptitude Assessments ({aptitudeTests.length})</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {aptitudeTests.map((t) => (
                    <div
                      key={t.test_id}
                      className={`p-4 flex items-center justify-between hover:bg-slate-50 transition ${
                        selectedTestForQuestions?.test_id === t.test_id ? 'bg-rose-50/50 border-l-4 border-rose-600' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{t.title}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                            {t.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{t.description || 'No description provided.'}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{t.duration_minutes} Minutes</span>
                          <span>•</span>
                          <span>{t.question_count || 0} Questions</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadTestQuestions(t)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
                        >
                          Manage MCQs
                        </button>
                        <button
                          onClick={() => handleDeleteTest(t.test_id)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Questions Manager within Selected Test */}
            {selectedTestForQuestions && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Question Editor: {selectedTestForQuestions.title}
                    </h4>
                    <p className="text-xs text-slate-500">Add and manage multiple-choice questions for this test</p>
                  </div>
                  <button
                    onClick={() => setSelectedTestForQuestions(null)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Create Question Form */}
                  <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h5 className="font-bold text-slate-800">New MCQ Prompt</h5>
                    <form onSubmit={handleCreateAQ} className="space-y-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Question Text *</label>
                        <textarea
                          required
                          rows={2}
                          value={aqText}
                          onChange={(e) => setAqText(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Option A *</label>
                        <input
                          type="text"
                          required
                          value={aqA}
                          onChange={(e) => setAqA(e.target.value)}
                          className="w-full px-2.5 py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Option B *</label>
                        <input
                          type="text"
                          required
                          value={aqB}
                          onChange={(e) => setAqB(e.target.value)}
                          className="w-full px-2.5 py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Option C *</label>
                        <input
                          type="text"
                          required
                          value={aqC}
                          onChange={(e) => setAqC(e.target.value)}
                          className="w-full px-2.5 py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Option D *</label>
                        <input
                          type="text"
                          required
                          value={aqD}
                          onChange={(e) => setAqD(e.target.value)}
                          className="w-full px-2.5 py-1 rounded border border-slate-300"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Correct</label>
                          <select
                            value={aqCorrect}
                            onChange={(e) => setAqCorrect(e.target.value as any)}
                            className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Marks</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={aqMarks}
                            onChange={(e) => setAqMarks(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-300"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded transition mt-2"
                      >
                        Add MCQ
                      </button>
                    </form>
                  </div>

                  {/* List Questions In Test */}
                  <div className="lg:col-span-2 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-slate-700">Questions in this Test ({testQuestions.length})</h4>
                    {testQuestions.map((q, idx) => (
                      <div key={q.question_id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900">
                            {idx + 1}. {q.question_text} <span className="text-slate-400 font-normal">({q.marks} Mark)</span>
                          </p>
                          <p className="text-slate-600">
                            A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d}
                          </p>
                          <p className="text-emerald-600 font-bold">Correct: Option {q.correct_option}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAQ(q.question_id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
