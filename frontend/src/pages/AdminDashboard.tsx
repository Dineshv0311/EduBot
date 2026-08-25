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
  FileText
} from 'lucide-react';

export default function AdminDashboard(): React.JSX.Element {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'companies' | 'questions' | 'aptitude'>('companies');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [companies, setCompanies] = useState<any[]>([]);
  const [interviewQuestions, setInterviewQuestions] = useState<any[]>([]);
  const [aptitudeTests, setAptitudeTests] = useState<any[]>([]);

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

  const fetchAllAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, iqRes, aptRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/companies', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/admin/interview-questions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/admin/aptitude-tests', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const compData = await compRes.json();
      const iqData = await iqRes.json();
      const aptData = await aptRes.json();

      setCompanies(compData.companies || []);
      setInterviewQuestions(iqData.questions || []);
      setAptitudeTests(aptData.tests || []);
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
      const res = await fetch('http://localhost:5000/api/admin/companies', {
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
      const res = await fetch(`http://localhost:5000/api/admin/companies/${id}`, {
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
      const res = await fetch('http://localhost:5000/api/admin/interview-questions', {
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
      const res = await fetch(`http://localhost:5000/api/admin/interview-questions/${id}`, {
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
      const res = await fetch('http://localhost:5000/api/admin/aptitude-tests', {
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
      const res = await fetch(`http://localhost:5000/api/admin/aptitude-tests/${id}`, {
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
      const res = await fetch(`http://localhost:5000/api/admin/aptitude-questions/${test.test_id}`, {
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
      const res = await fetch('http://localhost:5000/api/admin/aptitude-questions', {
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
      const res = await fetch(`http://localhost:5000/api/admin/aptitude-questions/${id}`, {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Admin Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-lg">
              A
            </div>
            <div>
              <span className="font-bold text-base">EduBot AI — Admin Panel</span>
              <span className="text-[10px] ml-2 px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-semibold border border-rose-800">
                Process 5.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              Admin: <strong className="text-slate-200">{user?.name}</strong>
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-slate-800 rounded-lg transition border border-slate-700"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-8">
          <button
            onClick={() => setActiveTab('companies')}
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'companies'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Companies & Content ({companies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
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
            className={`py-4 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
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
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ----------------- TAB 1: COMPANIES ----------------- */}
        {activeTab === 'companies' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Company Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Add Company Track</h2>
              <form onSubmit={handleCreateCompany} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amazon, Google, Zoho"
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Industry *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. E-Commerce, Cloud, SaaS"
                    value={compIndustry}
                    onChange={(e) => setCompIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={compWebsite}
                    onChange={(e) => setCompWebsite(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Overview of company tech stack and hiring domains..."
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Company Track</span>
                </button>
              </form>
            </div>

            {/* Companies List */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Registered Companies</h2>
              {companies.map((c) => (
                <div key={c.company_id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{c.company_name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {c.industry}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{c.description || 'No description provided.'}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                      <span>{c.question_count} Questions</span>
                      {c.website && <span className="text-indigo-600">{c.website}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCompany(c.company_id)}
                    className="text-slate-400 hover:text-rose-600 p-2 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB 2: INTERVIEW QUESTIONS ----------------- */}
        {activeTab === 'questions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Question Form */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Add Interview Question</h2>
              <form onSubmit={handleCreateIQ} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Track</label>
                  <select
                    value={iqCompanyId}
                    onChange={(e) => setIqCompanyId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="">General / No Company</option>
                    {companies.map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. System Design, Database, Behavioral"
                    value={iqCategory}
                    onChange={(e) => setIqCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty</label>
                  <select
                    value={iqDifficulty}
                    onChange={(e) => setIqDifficulty(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Question Text *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain how..."
                    value={iqText}
                    onChange={(e) => setIqText(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Question</span>
                </button>
              </form>
            </div>

            {/* Questions List */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Question Repository</h2>
              {interviewQuestions.map((q) => (
                <div key={q.question_id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600">{q.company_name || 'General Track'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {q.category} • {q.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">{q.question_text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteIQ(q.question_id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: APTITUDE TESTS & QUESTIONS ----------------- */}
        {activeTab === 'aptitude' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create Test Form */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Create Aptitude Test</h2>
                <form onSubmit={handleCreateTest} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Test Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Quantitative Speed Test"
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (Minutes) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={testDuration}
                      onChange={(e) => setTestDuration(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Difficulty</label>
                    <select
                      value={testDifficulty}
                      onChange={(e) => setTestDifficulty(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Topic focus..."
                      value={testDesc}
                      onChange={(e) => setTestDesc(e.target.value)}
                      className="w-full p-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Test</span>
                  </button>
                </form>
              </div>

              {/* Test List */}
              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Available Tests</h2>
                {aptitudeTests.map((t) => (
                  <div
                    key={t.test_id}
                    className={`p-4 bg-white rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      selectedTestForQuestions?.test_id === t.test_id
                        ? 'border-rose-500 ring-2 ring-rose-100'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                    onClick={() => loadTestQuestions(t)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {t.difficulty} • {t.duration_minutes} mins
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                        <span>{t.total_questions} Questions</span>
                        <span>{t.total_marks} Marks</span>
                        <span className="text-rose-600 font-semibold underline">Manage Questions</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTest(t.test_id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Test Questions Manager (Shown when test is clicked) */}
            {selectedTestForQuestions && (
              <div className="p-6 bg-slate-100 rounded-2xl border border-slate-300 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Managing Questions for: <span className="text-rose-600">{selectedTestForQuestions.title}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Add MCQ options and official answer keys</p>
                  </div>
                  <button
                    onClick={() => setSelectedTestForQuestions(null)}
                    className="text-xs font-semibold text-slate-600 hover:underline"
                  >
                    Close Manager
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Add MCQ Question Form */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase text-slate-700">Add Question</h4>
                    <form onSubmit={handleCreateAQ} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Question Text *</label>
                        <textarea
                          rows={2}
                          required
                          value={aqText}
                          onChange={(e) => setAqText(e.target.value)}
                          className="w-full p-2 text-xs rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">Option A *</label>
                          <input
                            type="text"
                            required
                            value={aqA}
                            onChange={(e) => setAqA(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">Option B *</label>
                          <input
                            type="text"
                            required
                            value={aqB}
                            onChange={(e) => setAqB(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">Option C *</label>
                          <input
                            type="text"
                            required
                            value={aqC}
                            onChange={(e) => setAqC(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">Option D *</label>
                          <input
                            type="text"
                            required
                            value={aqD}
                            onChange={(e) => setAqD(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">Correct Option *</label>
                          <select
                            value={aqCorrect}
                            onChange={(e) => setAqCorrect(e.target.value as 'A' | 'B' | 'C' | 'D')}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600">Marks *</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={aqMarks}
                            onChange={(e) => setAqMarks(e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded border border-slate-300"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Test</span>
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