import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Trash2,
  Clock,
  Briefcase,
  Search,
  Loader2,
  Layers,
  HelpCircle,
  Eye,
  X
} from 'lucide-react';
import {
  uploadResumeDocument,
  runResumeAnalysis,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysis,
  UploadedDocument,
  ResumeAnalysisRecord,
  HistorySummaryItem
} from '../services/resumeAnalyzerService';

export default function ResumeAnalyzer(): React.JSX.Element {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'analyzer' | 'history'>('analyzer');

  // Upload States
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showTextPreview, setShowTextPreview] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis Input States
  const [analysisMode, setAnalysisMode] = useState<'role_company' | 'job_description'>('role_company');
  const [targetCompany, setTargetCompany] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('Software Engineer');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Active Analysis Result
  const [currentAnalysis, setCurrentAnalysis] = useState<ResumeAnalysisRecord | null>(null);

  // History States
  const [history, setHistory] = useState<HistorySummaryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Comparison State
  const [compareAnalysis, setCompareAnalysis] = useState<ResumeAnalysisRecord | null>(null);
  const [loadingCompare, setLoadingCompare] = useState<boolean>(false);

  // Load history when tab is clicked
  useEffect(() => {
    if (token && activeTab === 'history') {
      fetchHistory();
    }
  }, [token, activeTab]);

  const fetchHistory = async () => {
    if (!token) return;
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await getAnalysisHistory(token);
      setHistory(res.history);
    } catch (err: any) {
      setHistoryError(err.message || 'Failed to load analysis history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processUpload(file);
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processUpload(file);
    }
  };

  const processUpload = async (file: File) => {
    if (!token) return;
    setUploadError(null);
    setUploading(true);

    try {
      const res = await uploadResumeDocument(file, token);
      setUploadedDoc(res.document);
    } catch (err: any) {
      setUploadError(err.message);
      setUploadedDoc(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveDocument = () => {
    setUploadedDoc(null);
    setShowTextPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run ATS Analysis
  const handleRunAnalysis = async () => {
    if (!token) return;
    if (!uploadedDoc) {
      setAnalysisError('Please upload your resume before starting the analysis.');
      return;
    }
    if (!targetRole.trim()) {
      setAnalysisError('Please enter a target job role.');
      return;
    }
    if (analysisMode === 'job_description' && (!jobDescription.trim() || jobDescription.trim().length < 20)) {
      setAnalysisError('Please paste a complete job description (at least 20 characters).');
      return;
    }

    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await runResumeAnalysis(
        {
          document_id: uploadedDoc.document_id,
          target_company: targetCompany.trim(),
          target_role: targetRole.trim(),
          job_description: jobDescription.trim(),
          analysis_mode: analysisMode
        },
        token
      );
      setCurrentAnalysis(res.analysis);
      // Scroll smoothly to results
      window.scrollTo({ top: 380, behavior: 'smooth' });
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // View Past Analysis from History
  const handleViewHistoricalAnalysis = async (id: number) => {
    if (!token) return;
    try {
      const res = await getAnalysisById(id, token);
      setCurrentAnalysis(res.analysis);
      setActiveTab('analyzer');
      window.scrollTo({ top: 380, behavior: 'smooth' });
    } catch (err: any) {
      alert('Failed to load past analysis: ' + err.message);
    }
  };

  // Compare an Analysis
  const handleCompareAnalysis = async (id: number) => {
    if (!token) return;
    setLoadingCompare(true);
    try {
      const res = await getAnalysisById(id, token);
      setCompareAnalysis(res.analysis);
    } catch (err: any) {
      alert('Failed to load comparison record: ' + err.message);
    } finally {
      setLoadingCompare(false);
    }
  };

  // Delete Analysis
  const handleDeleteAnalysis = async (id: number) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this analysis record?')) return;
    try {
      await deleteAnalysis(id, token);
      setHistory((prev) => prev.filter((item) => item.analysis_id !== id));
      if (currentAnalysis?.analysis_id === id) {
        setCurrentAnalysis(null);
      }
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  // Handoff to Resume Builder
  const handleHandoffToBuilder = () => {
    if (!currentAnalysis) {
      navigate('/resume');
      return;
    }
    const missingSkillsList = currentAnalysis.missing_skills.map((s) => s.skill);
    navigate('/resume', {
      state: {
        suggestedSkills: missingSkillsList,
        targetRole: currentAnalysis.target_role,
        source: 'analyzer'
      }
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    if (score >= 45) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-indigo-500';
    if (score >= 45) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const filteredHistory = history.filter((h) => {
    const q = historySearch.toLowerCase();
    return (
      h.target_role.toLowerCase().includes(q) ||
      (h.target_company && h.target_company.toLowerCase().includes(q)) ||
      (h.file_name && h.file_name.toLowerCase().includes(q))
    );
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-xs font-semibold text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Placement Intelligence & Screening Pre-Check</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ATS Resume Analyzer & Job Match Scoring
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Upload your existing PDF or DOCX resume, select your target role or paste a company job description, and receive an estimated ATS-style compatibility score, keyword gap analysis, and grounded recommendations.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="relative z-10 flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'analyzer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Resume</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Previous Analyses ({history.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ANALYZER WORKFLOW */}
      {activeTab === 'analyzer' && (
        <div className="space-y-8">
          {/* STEP 1 & 2: TWO COLUMN INPUT WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* COLUMN 1: RESUME UPLOAD */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Upload Existing Resume</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">PDF or DOCX (Max 5MB)</span>
                </div>

                {/* Drag and Drop Zone */}
                {!uploadedDoc ? (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                      uploading
                        ? 'border-indigo-400 bg-indigo-50/50'
                        : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {uploading ? 'Parsing and extracting text...' : 'Click to browse or drag & drop resume'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Supports standard text-based PDF or Microsoft Word (.docx)
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Uploaded File Card */
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 truncate max-w-xs">
                            {uploadedDoc.file_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {(uploadedDoc.file_size / 1024).toFixed(1)} KB • {uploadedDoc.parsed_data?.sections.skills.length || 0} skills detected
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowTextPreview(!showTextPreview)}
                          className="text-xs font-semibold px-2.5 py-1 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{showTextPreview ? 'Hide Text' : 'View Text'}</span>
                        </button>

                        <button
                          onClick={handleRemoveDocument}
                          title="Remove uploaded document"
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Extracted Text Snippet */}
                    {showTextPreview && (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-700 max-h-48 overflow-y-auto space-y-2">
                        <div className="flex items-center justify-between text-slate-400 font-sans font-bold text-[10px]">
                          <span>EXTRACTED RESUME TEXT PREVIEW</span>
                          <span>{uploadedDoc.parsed_data?.metrics.wordCount || 0} Words</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {uploadedDoc.extracted_text_preview}...
                        </p>
                      </div>
                    )}

                    {uploadedDoc.warnings && uploadedDoc.warnings.length > 0 && (
                      <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{uploadedDoc.warnings.join(' ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {uploadError && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Status Note */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>🔒 Private & student-owned document</span>
                <span>Protected against prompt injection</span>
              </div>
            </div>

            {/* COLUMN 2: TARGET ROLE & JOB DESCRIPTION */}
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Target Role & Analysis Mode</h2>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setAnalysisMode('role_company')}
                    className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      analysisMode === 'role_company'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Mode A: Role & Company</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAnalysisMode('job_description')}
                    className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      analysisMode === 'job_description'
                        ? 'bg-white text-indigo-600 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Mode B: Paste Job Description</span>
                  </button>
                </div>

                {/* Mode A Inputs */}
                {analysisMode === 'role_company' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Job Role <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Software Engineer, Frontend Developer, Backend Engineer"
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Company <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={targetCompany}
                        onChange={(e) => setTargetCompany(e.target.value)}
                        placeholder="e.g. TechCorp Labs, FinTech Solutions, Amazon, Google"
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Optional Role Details / Hiring Requirements
                      </label>
                      <textarea
                        rows={3}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste any key requirements, required tech stack, or qualification notes..."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* Mode B Inputs */
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Target Job Role Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="e.g. Full Stack Developer, Data Scientist"
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Complete Job Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={6}
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the complete job description, required responsibilities, and qualifications..."
                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {analysisError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{analysisError}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={!uploadedDoc || analyzing}
                  onClick={handleRunAnalysis}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-md"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Evaluating Against ATS Rubrics & Job Match...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run ATS & Job Match Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* STEP 3: RESULTS DASHBOARD */}
          {currentAnalysis && (
            <div className="space-y-8 animate-in fade-in-50 duration-300">
              {/* Disclaimer Notice */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Transparent Scoring Notice: </span>
                  <span>{currentAnalysis.disclaimer}</span>
                </div>
              </div>

              {/* TOP SCORE OVERVIEW CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Overall Score */}
                <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${getScoreColor(currentAnalysis.overall_score)}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider">Estimated ATS Score</span>
                  <div className="my-2">
                    <span className="text-3xl font-black">{currentAnalysis.overall_score}</span>
                    <span className="text-xs font-semibold ml-1">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${getScoreBg(currentAnalysis.overall_score)}`} style={{ width: `${currentAnalysis.overall_score}%` }} />
                  </div>
                </div>

                {/* Job Match Score */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Job Match</span>
                  <div className="my-2">
                    <span className="text-3xl font-black text-slate-900">{currentAnalysis.job_match_score}</span>
                    <span className="text-xs font-semibold text-slate-400 ml-1">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${currentAnalysis.job_match_score}%` }} />
                  </div>
                </div>

                {/* Resume Quality */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resume Quality</span>
                  <div className="my-2">
                    <span className="text-3xl font-black text-slate-900">{currentAnalysis.resume_quality_score}</span>
                    <span className="text-xs font-semibold text-slate-400 ml-1">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${currentAnalysis.resume_quality_score}%` }} />
                  </div>
                </div>

                {/* Keyword Coverage */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Keyword Coverage</span>
                  <div className="my-2">
                    <span className="text-3xl font-black text-slate-900">{currentAnalysis.keyword_coverage_score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${currentAnalysis.keyword_coverage_score}%` }} />
                  </div>
                </div>

                {/* Section Completeness */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completeness</span>
                  <div className="my-2">
                    <span className="text-3xl font-black text-slate-900">{currentAnalysis.section_completeness_score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${currentAnalysis.section_completeness_score}%` }} />
                  </div>
                </div>

                {/* Readability */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Readability</span>
                  <div className="my-2">
                    <span className="text-3xl font-black text-slate-900">{currentAnalysis.readability_score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-600" style={{ width: `${currentAnalysis.readability_score}%` }} />
                  </div>
                </div>
              </div>

              {/* ACTION HANDOFF BAR: IMPROVE IN RESUME BUILDER */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-white border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-sm font-bold text-indigo-950 flex items-center justify-center sm:justify-start gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>Improve Your Resume with These Recommendations</span>
                  </h3>
                  <p className="text-xs text-indigo-700">
                    Use our guided Resume Builder to incorporate missing skills and improve project action descriptions without losing your original file.
                  </p>
                </div>

                <button
                  onClick={handleHandoffToBuilder}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm flex-shrink-0"
                >
                  <span>Open in Resume Builder</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* TWO COLUMN CONTENT: STRENGTHS & MISSING SKILLS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Grounded Strengths */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Verified Strengths</h3>
                  </div>

                  <div className="space-y-2.5">
                    {currentAnalysis.strengths.map((str, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Skills & Keyword Gap */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Missing Skills & Keyword Gap</h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {currentAnalysis.missing_skills.length} Gaps Detected
                    </span>
                  </div>

                  {currentAnalysis.missing_skills.length === 0 ? (
                    <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Excellent! All core target role skills are present in your resume.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {currentAnalysis.missing_skills.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 hover:border-slate-300 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                              {item.skill}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                item.category === 'mandatory'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {item.category === 'mandatory' ? 'Mandatory Requirement' : 'Preferred Qualification'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">{item.why_it_matters}</p>
                          <p className="text-[11px] font-medium text-indigo-700 bg-indigo-50/50 p-2 rounded-lg">
                            💡 {item.suggested_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION-BY-SECTION FEEDBACK */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Section-by-Section ATS Evaluation</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(currentAnalysis.section_feedback).map(([sectionName, sec]) => (
                    <div
                      key={sectionName}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{sectionName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              sec.status === 'Complete'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sec.status === 'Needs Improvement'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {sec.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{sec.feedback}</p>
                      </div>

                      {sec.suggestions && sec.suggestions.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                          {sec.suggestions.map((sug, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-1.5">
                              <span className="text-indigo-600 font-bold">•</span>
                              <span>{sug}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* FORMATTING & ATS PARSING WARNINGS */}
              {currentAnalysis.formatting_warnings && currentAnalysis.formatting_warnings.length > 0 && (
                <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold">ATS Readability & Formatting Warnings</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {currentAnalysis.formatting_warnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2"
                      >
                        <span className="text-amber-500 font-bold">⚠️</span>
                        <span>{warn}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIORITIZED RECOMMENDATIONS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Prioritized Action Items</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentAnalysis.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-2 hover:border-indigo-300 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              rec.priority === 'high'
                                ? 'bg-rose-100 text-rose-700'
                                : rec.priority === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {rec.priority} Priority
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">{rec.category}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{rec.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY & COMPARISON */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Analysis History & Tracked Roles</h2>
                <p className="text-xs text-slate-500">
                  Review all previous resume screenings, compare scores across roles, and track improvements over time.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search by role or company..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {historyError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{historyError}</span>
              </div>
            )}

            {loadingHistory ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs text-slate-500">Loading analysis history...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                No resume analyses found. Upload a resume to generate your first ATS evaluation!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredHistory.map((item) => (
                  <div
                    key={item.analysis_id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.target_role}</span>
                        {item.target_company && (
                          <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                            {item.target_company}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        File: {item.file_name || 'Resume'} • Mode: {item.analysis_mode === 'role_company' ? 'Role & Company' : 'Pasted JD'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Score Badges */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">ATS Score</span>
                          <span className={`text-base font-black px-2 py-0.5 rounded-lg border ${getScoreColor(item.overall_score)}`}>
                            {item.overall_score}
                          </span>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-slate-400 block font-semibold">Job Match</span>
                          <span className="text-sm font-bold text-slate-800">{item.job_match_score}%</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewHistoricalAnalysis(item.analysis_id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                        >
                          View Report
                        </button>

                        <button
                          onClick={() => handleCompareAnalysis(item.analysis_id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        >
                          Compare
                        </button>

                        <button
                          onClick={() => handleDeleteAnalysis(item.analysis_id)}
                          title="Delete this analysis"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SIDE-BY-SIDE COMPARISON MODAL / PANEL */}
          {compareAnalysis && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Role Comparison: {currentAnalysis ? currentAnalysis.target_role : 'Current'} vs {compareAnalysis.target_role}
                  </h3>
                  {loadingCompare && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                </div>

                <button
                  onClick={() => setCompareAnalysis(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Column A */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-indigo-700">
                    {currentAnalysis?.target_role || 'Active Analysis'}
                  </span>
                  <div className="text-2xl font-black">{currentAnalysis?.overall_score || 0} / 100</div>
                  <p className="text-xs text-slate-500">
                    Job Match: <strong>{currentAnalysis?.job_match_score || 0}%</strong> • Coverage: <strong>{currentAnalysis?.keyword_coverage_score || 0}%</strong>
                  </p>
                </div>

                {/* Column B */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <span className="text-xs font-bold text-indigo-700">{compareAnalysis.target_role}</span>
                  <div className="text-2xl font-black text-indigo-900">{compareAnalysis.overall_score} / 100</div>
                  <p className="text-xs text-indigo-700">
                    Job Match: <strong>{compareAnalysis.job_match_score}%</strong> • Coverage: <strong>{compareAnalysis.keyword_coverage_score}%</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
