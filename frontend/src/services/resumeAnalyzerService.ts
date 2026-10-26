import API_BASE_URL from './api';

export interface ParsedResumeData {
  contact: {
    email: string | null;
    phone: string | null;
    links: string[];
    nameEstimate: string | null;
  };
  sections: {
    summary: string | null;
    education: string | null;
    skills: string[];
    experience: string | null;
    projects: string | null;
    certifications: string | null;
    achievements: string | null;
  };
  metrics: {
    wordCount: number;
    bulletCount: number;
    quantifiedMetricsCount: number;
    actionVerbsFound: string[];
  };
}

export interface UploadedDocument {
  document_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  skills_count?: number;
  extracted_text_preview?: string;
  parsed_data?: ParsedResumeData;
  warnings?: string[];
}

export interface MissingSkillItem {
  skill: string;
  category: 'mandatory' | 'preferred';
  why_it_matters: string;
  suggested_action: string;
  found: boolean;
}

export interface RecommendationItem {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  category: string;
}

export interface SectionFeedback {
  status: 'Complete' | 'Needs Improvement' | 'Missing';
  feedback: string;
  suggestions: string[];
}

export interface ScoringSubcategory {
  score: number;
  max: number;
  details: string;
}

export interface ResumeAnalysisRecord {
  analysis_id: number;
  user_id: number;
  document_id: number;
  file_name?: string;
  target_company: string | null;
  target_role: string;
  job_description: string | null;
  analysis_mode: 'role_company' | 'job_description';
  overall_score: number;
  job_match_score: number;
  resume_quality_score: number;
  keyword_coverage_score: number;
  section_completeness_score: number;
  readability_score: number;
  scoring_breakdown: {
    job_match: {
      required_skills: ScoringSubcategory;
      experience_projects: ScoringSubcategory;
      job_keywords: ScoringSubcategory;
      education_certs: ScoringSubcategory;
      role_evidence: ScoringSubcategory;
    };
    resume_quality: {
      section_completeness: ScoringSubcategory;
      action_verbs_metrics: ScoringSubcategory;
      formatting_readability: ScoringSubcategory;
      contact_presentation: ScoringSubcategory;
    };
  };
  strengths: string[];
  missing_skills: MissingSkillItem[];
  section_feedback: Record<string, SectionFeedback>;
  formatting_warnings: string[];
  recommendations: RecommendationItem[];
  rubric_version: string;
  disclaimer: string;
  created_at: string;
}

export interface HistorySummaryItem {
  analysis_id: number;
  document_id: number;
  file_name: string | null;
  target_company: string | null;
  target_role: string;
  analysis_mode: 'role_company' | 'job_description';
  overall_score: number;
  job_match_score: number;
  resume_quality_score: number;
  keyword_coverage_score: number;
  section_completeness_score: number;
  readability_score: number;
  created_at: string;
}

// 1. Upload Resume File (PDF / DOCX)
export async function uploadResumeDocument(
  file: File,
  token: string
): Promise<{ document: UploadedDocument }> {
  const formData = new FormData();
  formData.append('resume', file);

  const res = await fetch(`${API_BASE_URL}/resume-analyzer/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to upload resume document.');
  }
  return data;
}

// 2. Run ATS Analysis
export async function runResumeAnalysis(
  payload: {
    document_id: number;
    target_company?: string;
    target_role: string;
    job_description?: string;
    analysis_mode: 'role_company' | 'job_description';
    apiKey?: string;
  },
  token: string
): Promise<{ analysis: ResumeAnalysisRecord }> {
  const res = await fetch(`${API_BASE_URL}/resume-analyzer/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to analyze resume.');
  }
  return data;
}

// 3. Get Analysis History
export async function getAnalysisHistory(
  token: string
): Promise<{ history: HistorySummaryItem[] }> {
  const res = await fetch(`${API_BASE_URL}/resume-analyzer/history`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch analysis history.');
  }
  return data;
}

// 4. Get Analysis Details by ID
export async function getAnalysisById(
  analysisId: number,
  token: string
): Promise<{ analysis: ResumeAnalysisRecord }> {
  const res = await fetch(`${API_BASE_URL}/resume-analyzer/${analysisId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load analysis details.');
  }
  return data;
}

// 5. Delete an Analysis
export async function deleteAnalysis(
  analysisId: number,
  token: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/resume-analyzer/${analysisId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete analysis record.');
  }
  return data;
}

// 6. Get Uploaded Documents
export async function getUploadedDocuments(
  token: string
): Promise<{ documents: UploadedDocument[] }> {
  const res = await fetch(`${API_BASE_URL}/resume-analyzer/documents`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch uploaded documents.');
  }
  return data;
}

// 7. Delete Document
export async function deleteDocument(
  docId: number,
  token: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/resume-analyzer/document/${docId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete resume document.');
  }
  return data;
}
