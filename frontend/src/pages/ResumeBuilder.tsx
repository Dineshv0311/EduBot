import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { 
  Save, 
  Download, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface Project {
  project_id?: number;
  project_name: string;
  description: string;
  technologies: string;
  project_url: string;
}

interface Skill {
  skill_id?: number;
  skill_name: string;
  skill_category: string;
}

export default function ResumeBuilder(): React.JSX.Element {
  const { token, user } = useAuth();

  const [summary, setSummary] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving' | 'Invalid Data' | 'Unsaved'>('Saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Frontend');

  const resumePreviewRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const res = await fetch('http://13.51.54.37/api/resume', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data.resume.summary || '');
          setProjects(data.resume.projects || []);
          setSkills(data.resume.skills || []);
          if (data.resume.updated_at) {
            setLastSavedTime(new Date(data.resume.updated_at).toLocaleTimeString());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [token]);

  const validateData = (): boolean => {
    for (const p of projects) {
      if (!p.project_name.trim() && (p.description.trim() || p.technologies.trim())) {
        return false;
      }
    }
    return true;
  };

  const saveResume = async () => {
    if (!validateData()) {
      setSaveStatus('Invalid Data');
      return;
    }

    setSaveStatus('Saving');
    try {
      const res = await fetch('http://13.51.54.37/api/resume', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ summary, projects, skills })
      });

      if (res.ok) {
        setSaveStatus('Saved');
        setLastSavedTime(new Date().toLocaleTimeString());
      } else {
        setSaveStatus('Unsaved');
      }
    } catch (err) {
      setSaveStatus('Unsaved');
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        saveResume();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [summary, projects, skills, loading]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus('Unsaved');
  }, [summary, projects, skills]);

  const addProject = () => {
    setProjects([
      ...projects,
      { project_name: '', description: '', technologies: '', project_url: '' }
    ]);
  };

  const updateProject = (index: number, field: keyof Project, value: string) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    setSkills([
      ...skills,
      { skill_name: newSkillName.trim(), skill_category: newSkillCategory }
    ]);
    setNewSkillName('');
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleExportPdf = () => {
    if (!resumePreviewRef.current) return;
    setIsExporting(true);

    const userName = user?.name ? user.name.replace(/\s+/g, '_') : 'User';

    const opt = {
      margin: 10,
      filename: `${userName}_Resume.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    html2pdf()
      .from(resumePreviewRef.current)
      .set(opt)
      .save()
      .then(() => setIsExporting(false))
      .catch(() => setIsExporting(false));
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Resume Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Resume Builder & Portfolio</h1>
          <p className="text-xs text-slate-500">Live editor with 60-second automatic background sync</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200">
            {saveStatus === 'Saving' && (
              <span className="text-amber-600 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-saving...
              </span>
            )}
            {saveStatus === 'Saved' && (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Saved {lastSavedTime && `at ${lastSavedTime}`}
              </span>
            )}
            {saveStatus === 'Unsaved' && (
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Unsaved changes
              </span>
            )}
            {saveStatus === 'Invalid Data' && (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Enter project names before saving
              </span>
            )}
          </div>

          <button
            onClick={saveResume}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Now</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              1. Professional Summary
            </h2>
            <textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Detail your engineering focus, key achievements, and placement goals..."
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              2. Technical Skills
            </h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="e.g. React, PostgreSQL, Docker"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="Languages">Languages</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Database">Database</option>
                <option value="Tools">Tools & Core</option>
              </select>
              <button
                onClick={addSkill}
                type="button"
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                >
                  <span className="font-semibold text-indigo-600">[{s.skill_category}]</span>
                  <span>{s.skill_name}</span>
                  <button
                    onClick={() => removeSkill(idx)}
                    className="text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Key Projects
              </h2>
              <button
                onClick={addProject}
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Project</span>
              </button>
            </div>

            <div className="space-y-4">
              {projects.map((p, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg relative space-y-3">
                  <button
                    onClick={() => removeProject(idx)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Task Scheduler"
                      value={p.project_name}
                      onChange={(e) => updateProject(idx, 'project_name', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Technologies Used</label>
                    <input
                      type="text"
                      placeholder="e.g. Node.js, Redis, WebSockets"
                      value={p.technologies}
                      onChange={(e) => updateProject(idx, 'technologies', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Project URL</label>
                    <input
                      type="url"
                      placeholder="https://github.com/..."
                      value={p.project_url}
                      onChange={(e) => updateProject(idx, 'project_url', e.target.value)}
                      className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                    <textarea
                      rows={2}
                      placeholder="Key features, architectural patterns, and measurable results..."
                      value={p.description}
                      onChange={(e) => updateProject(idx, 'description', e.target.value)}
                      className="w-full p-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Resume Preview */}
        <div className="lg:col-span-6">
          <div className="sticky top-24">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Live Document Preview (A4 Formatted)
            </div>

            <div
              ref={resumePreviewRef}
              className="bg-white p-8 rounded-xl border border-slate-300 shadow-md text-slate-800 min-h-[600px]"
            >
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
                  {user?.name || 'Your Full Name'}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">{user?.email}</p>
              </div>

              {summary && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                    Professional Summary
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              )}

              {skills.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                    Technical Skills
                  </h3>
                  <div className="space-y-1">
                    {Array.from(new Set(skills.map((s) => s.skill_category))).map((cat) => (
                      <div key={cat} className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">{cat}: </span>
                        {skills
                          .filter((s) => s.skill_category === cat)
                          .map((s) => s.skill_name)
                          .join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {projects.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 mb-2">
                    Projects & Engineering Work
                  </h3>
                  <div className="space-y-3">
                    {projects.map((p, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{p.project_name || 'Untitled Project'}</span>
                          {p.project_url && (
                            <span className="text-[10px] text-indigo-600 font-normal underline">
                              {p.project_url}
                            </span>
                          )}
                        </div>
                        {p.technologies && (
                          <div className="text-[11px] text-slate-600 italic mt-0.5">
                            Technologies: {p.technologies}
                          </div>
                        )}
                        {p.description && (
                          <p className="text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">
                            {p.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}