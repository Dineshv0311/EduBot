import { createRequire } from 'module';
import mammoth from 'mammoth';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
// Load pdf-parse internal lib directly to prevent debug test runner execution
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

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

export interface ResumeAnalysisResult {
  overall_score: number;
  job_match_score: number;
  resume_quality_score: number;
  keyword_coverage_score: number;
  section_completeness_score: number;
  readability_score: number;
  scoring_breakdown: {
    job_match: {
      required_skills: { score: number; max: 40; details: string };
      experience_projects: { score: number; max: 25; details: string };
      job_keywords: { score: number; max: 15; details: string };
      education_certs: { score: number; max: 10; details: string };
      role_evidence: { score: number; max: 10; details: string };
    };
    resume_quality: {
      section_completeness: { score: number; max: 30; details: string };
      action_verbs_metrics: { score: number; max: 25; details: string };
      formatting_readability: { score: number; max: 25; details: string };
      contact_presentation: { score: number; max: 20; details: string };
    };
  };
  strengths: string[];
  missing_skills: MissingSkillItem[];
  section_feedback: Record<string, SectionFeedback>;
  formatting_warnings: string[];
  recommendations: RecommendationItem[];
  rubric_version: string;
  disclaimer: string;
}

// Master tech skill taxonomy for normalization & keyword matching
const SKILL_TAXONOMY: Record<string, string[]> = {
  Languages: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c', 'c#', 'go', 'golang', 'rust',
    'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 'css', 'sass', 'bash', 'shell'
  ],
  Frontend: [
    'react', 'next.js', 'vue', 'angular', 'redux', 'tailwind', 'bootstrap', 'webpack',
    'vite', 'html5', 'css3', 'responsive design', 'single page application', 'dom manipulation'
  ],
  Backend: [
    'node.js', 'express', 'django', 'fastapi', 'flask', 'spring boot', 'asp.net', 'rest api',
    'graphql', 'grpc', 'microservices', 'jwt', 'oauth', 'middleware'
  ],
  Databases: [
    'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'dynamodb', 'cassandra', 'oracle',
    'prisma', 'mongoose', 'typeorm', 'acid', 'indexing', 'transactions'
  ],
  CloudDevOps: [
    'aws', 'docker', 'kubernetes', 'ci/cd', 'github actions', 'terraform', 'jenkins', 'git',
    'linux', 'nginx', 's3', 'ec2', 'lambda', 'cloud computing', 'monitoring'
  ],
  DSAConcepts: [
    'data structures', 'algorithms', 'arrays', 'strings', 'linked lists', 'trees', 'graphs',
    'dynamic programming', 'hash maps', 'sorting', 'recursion', 'time complexity', 'space complexity',
    'system design', 'object oriented programming', 'oop', 'design patterns'
  ]
};

const ACTION_VERBS = [
  'architected', 'developed', 'built', 'implemented', 'optimized', 'engineered', 'spearheaded',
  'refactored', 'designed', 'scaled', 'automated', 'integrated', 'resolved', 'deployed',
  'orchestrated', 'accelerated', 'reduced', 'increased', 'boosted', 'improved', 'created'
];

/**
 * Validates document buffer, detects magic bytes, and extracts clean text
 */
export async function validateAndExtractResume(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ text: string; fileType: string; fileSize: number; warnings: string[] }> {
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  if (buffer.length > maxBytes) {
    throw new Error('File size exceeds the 5 MB limit. Please upload a smaller document.');
  }

  if (buffer.length < 100) {
    throw new Error('The uploaded file is empty or corrupted. Please check your document.');
  }

  const warnings: string[] = [];
  let fileType = '';
  let extractedText = '';

  // Validate magic bytes
  const isPdf = buffer.slice(0, 4).toString('ascii') === '%PDF';
  const isZipDocx = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

  if (isPdf) {
    fileType = 'application/pdf';
    try {
      const data = await pdfParse(buffer);
      extractedText = data.text || '';
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document. It may be encrypted or password-protected: ${err.message}`);
    }
  } else if (isZipDocx || originalName.toLowerCase().endsWith('.docx') || mimeType.includes('wordprocessingml')) {
    fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    try {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
      if (result.messages && result.messages.length > 0) {
        warnings.push('Some document formatting could not be fully parsed.');
      }
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message}`);
    }
  } else {
    throw new Error('Unsupported document format. Only PDF (.pdf) and Microsoft Word (.docx) files are supported.');
  }

  // Normalize text and strip malicious prompt injection payloads
  let cleanText = extractedText
    .replace(/\r\n/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  // Prompt injection neutralization
  cleanText = cleanText.replace(/(\b(ignore|disregard|forget)\b.*?\b(previous|all|system)\b.*?\b(instructions|rules|prompts)\b)/gi, '[REDACTED_SECURITY_PATTERN]');

  if (cleanText.replace(/\s/g, '').length < 60) {
    throw new Error('Unable to extract sufficient readable text. The document appears empty, scanned, or contains only images. Please upload a text-based resume.');
  }

  return {
    text: cleanText,
    fileType,
    fileSize: buffer.length,
    warnings
  };
}

/**
 * Deterministically parses structured sections, contact details, and skill tokens
 */
export function parseResumeSections(text: string): ParsedResumeData {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. Contact Extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : null;

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : null;

  const links: string[] = [];
  const linkMatches = text.matchAll(/(https?:\/\/[^\s]+|linkedin\.com\/in\/[^\s]+|github\.com\/[^\s]+)/gi);
  for (const match of linkMatches) {
    links.push(match[0]);
  }

  // Name estimation (usually 1st or 2nd non-empty line with letters)
  let nameEstimate: string | null = null;
  for (const line of lines.slice(0, 4)) {
    if (line.length > 2 && line.length < 50 && !line.includes('@') && !line.includes('http') && !/\d/.test(line)) {
      nameEstimate = line;
      break;
    }
  }

  // 2. Section Partitioning
  const lowerText = text.toLowerCase();
  const sectionKeywords: Record<string, string[]> = {
    summary: ['summary', 'profile', 'objective', 'about me', 'professional summary'],
    skills: ['skills', 'technical skills', 'core competencies', 'technologies', 'proficiencies', 'tools'],
    experience: ['experience', 'work experience', 'employment', 'internships', 'work history'],
    projects: ['projects', 'personal projects', 'academic projects', 'key projects'],
    education: ['education', 'academic qualifications', 'academics', 'degrees'],
    certifications: ['certifications', 'certificates', 'licenses', 'courses'],
    achievements: ['achievements', 'awards', 'honors', 'extracurricular']
  };

  const sections: Record<string, string | null> = {
    summary: null,
    education: null,
    skills: null,
    experience: null,
    projects: null,
    certifications: null,
    achievements: null
  };

  for (const [secKey, aliases] of Object.entries(sectionKeywords)) {
    for (const alias of aliases) {
      const idx = lowerText.indexOf(alias);
      if (idx !== -1) {
        // Grab a window of up to 1000 characters from the section start
        const snippet = text.slice(idx, idx + 1000).trim();
        sections[secKey] = snippet;
        break;
      }
    }
  }

  // 3. Technical Skills Extraction from Taxonomy
  const foundSkillsSet = new Set<string>();
  const flatTaxonomy = Object.values(SKILL_TAXONOMY).flat();
  for (const skill of flatTaxonomy) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9+#])${escaped}([^a-zA-Z0-9+#]|$)`, 'i');
    if (regex.test(text)) {
      foundSkillsSet.add(skill);
    }
  }

  // 4. Content Metrics
  const words = text.split(/\s+/).filter(Boolean);
  const bulletCount = (text.match(/^[•\-\*]\s+/gm) || []).length;
  const quantifiedMetricsCount = (text.match(/\b\d+(\.\d+)?%|\b\$\d+|\b\d+\s*(users|clients|ms|seconds|times|x)\b/gi) || []).length;

  const foundActionVerbs: string[] = [];
  for (const verb of ACTION_VERBS) {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(text)) {
      foundActionVerbs.push(verb);
    }
  }

  return {
    contact: {
      email,
      phone,
      links,
      nameEstimate
    },
    sections: {
      summary: sections.summary,
      education: sections.education,
      skills: Array.from(foundSkillsSet),
      experience: sections.experience,
      projects: sections.projects,
      certifications: sections.certifications,
      achievements: sections.achievements
    },
    metrics: {
      wordCount: words.length,
      bulletCount,
      quantifiedMetricsCount,
      actionVerbsFound: foundActionVerbs
    }
  };
}

/**
 * Extracts target requirements and keywords from job description or target role
 */
function extractJobRequirements(role: string, jobDescription?: string): {
  requiredSkills: string[];
  preferredSkills: string[];
  keywords: string[];
} {
  const roleLower = role.toLowerCase();
  const jdLower = (jobDescription || '').toLowerCase();
  const combined = `${roleLower}\n${jdLower}`;

  const allSkills = Object.values(SKILL_TAXONOMY).flat();
  const matchedSkills: string[] = [];

  for (const skill of allSkills) {
    const escaped = skill.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9+#])${escaped}([^a-zA-Z0-9+#]|$)`, 'i');
    if (regex.test(combined)) {
      matchedSkills.push(skill);
    }
  }

  // Fallback defaults based on role if job description had few skills
  if (matchedSkills.length < 3) {
    if (roleLower.includes('frontend') || roleLower.includes('react') || roleLower.includes('web')) {
      matchedSkills.push('react', 'javascript', 'typescript', 'html', 'css', 'tailwind', 'git');
    } else if (roleLower.includes('backend') || roleLower.includes('node') || roleLower.includes('api')) {
      matchedSkills.push('node.js', 'express', 'postgresql', 'sql', 'rest api', 'docker', 'git');
    } else if (roleLower.includes('full stack') || roleLower.includes('software')) {
      matchedSkills.push('javascript', 'python', 'react', 'node.js', 'sql', 'git', 'data structures');
    } else if (roleLower.includes('data') || roleLower.includes('ai') || roleLower.includes('ml')) {
      matchedSkills.push('python', 'sql', 'algorithms', 'data structures', 'machine learning');
    } else {
      matchedSkills.push('python', 'javascript', 'sql', 'git', 'data structures', 'problem solving');
    }
  }

  // Split into required vs preferred
  const uniqueSkills = Array.from(new Set(matchedSkills));
  const splitPoint = Math.max(1, Math.ceil(uniqueSkills.length * 0.65));
  const required = uniqueSkills.slice(0, splitPoint);
  const preferred = uniqueSkills.slice(splitPoint);

  // Extract other job keywords (concepts, degrees, soft skills)
  const additionalKeywords = ['system design', 'agile', 'ci/cd', 'unit testing', 'bachelor', 'computer science', 'problem solving', 'collaboration'];
  const matchedKeywords = additionalKeywords.filter((k) => combined.includes(k));

  return {
    requiredSkills: required,
    preferredSkills: preferred,
    keywords: matchedKeywords
  };
}

/**
 * Deterministic scoring engine implementing explainable rubrics
 */
export function calculateAtsScores(
  parsed: ParsedResumeData,
  role: string,
  jobDescription?: string
): ResumeAnalysisResult {
  const reqs = extractJobRequirements(role, jobDescription);
  const resumeSkills = new Set(parsed.sections.skills.map((s) => s.toLowerCase()));

  // 1. Skill Matching Analysis
  const missingSkills: MissingSkillItem[] = [];
  const strengths: string[] = [];
  let requiredMatchedCount = 0;
  let preferredMatchedCount = 0;

  for (const req of reqs.requiredSkills) {
    const found = resumeSkills.has(req.toLowerCase());
    if (found) {
      requiredMatchedCount++;
      strengths.push(`Matches essential required skill: ${req.toUpperCase()}`);
    } else {
      missingSkills.push({
        skill: req,
        category: 'mandatory',
        why_it_matters: `Core requirement for ${role} roles.`,
        suggested_action: `If you have worked with ${req}, explicitly showcase it under Skills and relevant projects.`,
        found: false
      });
    }
  }

  for (const pref of reqs.preferredSkills) {
    const found = resumeSkills.has(pref.toLowerCase());
    if (found) {
      preferredMatchedCount++;
      strengths.push(`Matches preferred qualification: ${pref.toUpperCase()}`);
    } else {
      missingSkills.push({
        skill: pref,
        category: 'preferred',
        why_it_matters: `Valuable differentiator for competitive candidate screening.`,
        suggested_action: `Consider highlighting practical exposure to ${pref} if applicable.`,
        found: false
      });
    }
  }

  // A. Job Match Score (0 - 100)
  // Required skills (40%), Experience & Projects (25%), Keywords (15%), Education & Certs (10%), Role Evidence (10%)
  const reqSkillRatio = reqs.requiredSkills.length > 0 ? requiredMatchedCount / reqs.requiredSkills.length : 0.8;
  const prefSkillRatio = reqs.preferredSkills.length > 0 ? preferredMatchedCount / reqs.preferredSkills.length : 0.7;
  const skillScore = Math.min(40, Math.round(reqSkillRatio * 32 + prefSkillRatio * 8));

  // Projects & Experience: reward evidence of projects + experience sections
  let expProjScore = 0;
  if (parsed.sections.projects) expProjScore += 15;
  if (parsed.sections.experience) expProjScore += 10;

  // Keyword coverage (15%)
  const keywordRatio = (requiredMatchedCount + preferredMatchedCount) / Math.max(1, reqs.requiredSkills.length + reqs.preferredSkills.length);
  const keywordScore = Math.round(keywordRatio * 15);

  // Education & Certifications (10%)
  let eduCertScore = 0;
  if (parsed.sections.education) eduCertScore += 7;
  if (parsed.sections.certifications || parsed.sections.achievements) eduCertScore += 3;

  // Role Evidence & Responsibilities (10%)
  const actionVerbBonus = Math.min(10, Math.round((parsed.metrics.actionVerbsFound.length / 5) * 10));

  const jobMatchScore = Math.min(100, skillScore + expProjScore + keywordScore + eduCertScore + actionVerbBonus);

  // B. Resume Quality Score (0 - 100)
  // Section Completeness (30%), Action Verbs & Metrics (25%), Formatting & Readability (25%), Contact & Presentation (20%)
  let sectionScore = 0;
  if (parsed.contact.email && parsed.contact.phone) sectionScore += 6;
  if (parsed.sections.summary) sectionScore += 5;
  if (parsed.sections.education) sectionScore += 5;
  if (parsed.sections.skills.length >= 4) sectionScore += 6;
  if (parsed.sections.projects) sectionScore += 5;
  if (parsed.sections.experience || parsed.sections.achievements) sectionScore += 3;

  // Action verbs & quantified impact (25%)
  const verbScore = Math.min(15, parsed.metrics.actionVerbsFound.length * 2.5);
  const metricScore = Math.min(10, parsed.metrics.quantifiedMetricsCount * 3.5);
  const impactScore = Math.round(verbScore + metricScore);

  // Formatting & Readability (25%)
  let formatScore = 20;
  const formattingWarnings: string[] = [];

  if (parsed.metrics.wordCount < 180) {
    formatScore -= 8;
    formattingWarnings.push('Resume word count is low (<180 words). Expand on key project outcomes and technical skills.');
  } else if (parsed.metrics.wordCount > 1200) {
    formatScore -= 4;
    formattingWarnings.push('Resume length exceeds standard 1-2 page limits (>1200 words). Condense bullet points for readability.');
  }

  if (parsed.metrics.bulletCount < 3) {
    formatScore -= 4;
    formattingWarnings.push('Few bullet points detected. ATS scanners parse bulleted achievements significantly better than dense paragraphs.');
  }

  if (!parsed.contact.links || parsed.contact.links.length === 0) {
    formattingWarnings.push('No portfolio, GitHub, or LinkedIn profile links detected. Include active URLs for technical verification.');
  }

  // Contact completeness (20%)
  let contactScore = 0;
  if (parsed.contact.email) contactScore += 8;
  if (parsed.contact.phone) contactScore += 7;
  if (parsed.contact.links.length > 0) contactScore += 5;

  const resumeQualityScore = Math.min(100, Math.round(sectionScore + impactScore + formatScore + contactScore));

  // Keyword coverage percentage
  const totalKeywordsToSearch = reqs.requiredSkills.length + reqs.preferredSkills.length;
  const totalKeywordsFound = requiredMatchedCount + preferredMatchedCount;
  const keywordCoverageScore = Math.round((totalKeywordsFound / Math.max(1, totalKeywordsToSearch)) * 100);

  // Section completeness percentage
  const sectionCompletenessScore = Math.round((sectionScore / 30) * 100);

  // Readability score
  const readabilityScore = Math.min(100, Math.round((formatScore / 20) * 100));

  // Overall Estimated ATS Score (Weighted Composite: 60% Job Match + 40% Resume Quality)
  const overallScore = Math.min(100, Math.round(jobMatchScore * 0.6 + resumeQualityScore * 0.4));

  // Additional grounded strengths
  if (parsed.metrics.quantifiedMetricsCount >= 2) {
    strengths.push('Effective use of quantified results (metrics and percentages) in project impact.');
  }
  if (parsed.metrics.actionVerbsFound.length >= 4) {
    strengths.push(`Strong active leadership verbs utilized: ${parsed.metrics.actionVerbsFound.slice(0, 4).join(', ')}.`);
  }
  if (parsed.sections.skills.length >= 6) {
    strengths.push(`Broad technical skills portfolio (${parsed.sections.skills.length} verified technologies identified).`);
  }

  // Section-level Feedback
  const sectionFeedback: Record<string, SectionFeedback> = {
    Summary: {
      status: parsed.sections.summary ? 'Complete' : 'Needs Improvement',
      feedback: parsed.sections.summary
        ? 'Professional summary detected. Ensure it directly aligns with the target role and key technical strengths.'
        : 'Missing dedicated Professional Summary section. Adding a concise 2-3 line summary improves initial recruiter and ATS scanning.',
      suggestions: parsed.sections.summary
        ? ['Tailor your summary opening sentence to specify your target role title.']
        : ['Add a 3-sentence summary highlighting your primary technical stack and placement goals.']
    },
    Skills: {
      status: parsed.sections.skills.length >= 5 ? 'Complete' : 'Needs Improvement',
      feedback: `Identified ${parsed.sections.skills.length} recognized technical skills.`,
      suggestions: missingSkills.length > 0
        ? [`Prioritize adding missing keywords: ${missingSkills.slice(0, 3).map((m) => m.skill).join(', ')} if experienced.`]
        : ['Organize skills into clean categories (Languages, Frameworks, Cloud, Databases).']
    },
    Projects: {
      status: parsed.sections.projects ? 'Complete' : 'Missing',
      feedback: parsed.sections.projects
        ? 'Projects section is present with recognizable technical contributions.'
        : 'No clear Projects section identified. Hands-on project defense is critical for campus placement selection.',
      suggestions: [
        'Frame projects using the STAR method (Situation, Task, Action, Result).',
        'State exact technologies used in each project title or subtitle.'
      ]
    },
    Education: {
      status: parsed.sections.education ? 'Complete' : 'Needs Improvement',
      feedback: parsed.sections.education
        ? 'Education section detected with academic credentials.'
        : 'Ensure your degree, institution, branch, and graduation year are prominent under an "Education" heading.',
      suggestions: ['List CGPA/Percentage, degree title, and graduation year clearly.']
    },
    Experience: {
      status: parsed.sections.experience ? 'Complete' : 'Needs Improvement',
      feedback: parsed.sections.experience
        ? 'Work history / internships detected.'
        : 'If you have completed internships, freelance projects, or college lab roles, list them with dates and outcomes.',
      suggestions: ['Quantify outcomes (e.g., "Reduced loading time by 20%").']
    }
  };

  // Prioritized Recommendations
  const recommendations: RecommendationItem[] = [];

  if (missingSkills.filter((m) => m.category === 'mandatory').length > 0) {
    recommendations.push({
      priority: 'high',
      title: 'Incorporate Critical Target Skills',
      description: `Target role requires skills currently missing from your resume: ${missingSkills
        .filter((m) => m.category === 'mandatory')
        .slice(0, 3)
        .map((m) => m.skill.toUpperCase())
        .join(', ')}. If you have practical experience with these, add them to your Skills and Project descriptions.`,
      category: 'Skills Alignment'
    });
  }

  if (parsed.metrics.quantifiedMetricsCount < 2) {
    recommendations.push({
      priority: 'high',
      title: 'Quantify Project & Experience Outcomes',
      description: 'Add measurable numbers (e.g., percentages, load time improvements, active users) to your project bullet points to provide concrete proof of competence.',
      category: 'Impact & Content'
    });
  }

  if (!parsed.sections.summary) {
    recommendations.push({
      priority: 'medium',
      title: 'Craft a Targeted Professional Summary',
      description: `Include a 2-3 line summary at the top of your resume explicitly stating your specialization in ${role} technologies.`,
      category: 'Structure'
    });
  }

  if (parsed.metrics.bulletCount < 4) {
    recommendations.push({
      priority: 'medium',
      title: 'Structure Descriptions with Action-Oriented Bullets',
      description: 'Break dense paragraphs into crisp bullet points starting with strong action verbs (e.g., Architected, Spearheaded, Implemented).',
      category: 'Formatting'
    });
  }

  if (parsed.contact.links.length === 0) {
    recommendations.push({
      priority: 'low',
      title: 'Attach Technical Profile Links',
      description: 'Include clean hyperlinks to your GitHub profile, LinkedIn account, or deployed project demos.',
      category: 'Contact'
    });
  }

  return {
    overall_score: overallScore,
    job_match_score: jobMatchScore,
    resume_quality_score: resumeQualityScore,
    keyword_coverage_score: keywordCoverageScore,
    section_completeness_score: sectionCompletenessScore,
    readability_score: readabilityScore,
    scoring_breakdown: {
      job_match: {
        required_skills: { score: skillScore, max: 40, details: `${requiredMatchedCount}/${reqs.requiredSkills.length} mandatory skills matched` },
        experience_projects: { score: expProjScore, max: 25, details: parsed.sections.projects ? 'Projects section validated' : 'Projects section missing' },
        job_keywords: { score: keywordScore, max: 15, details: `${totalKeywordsFound}/${totalKeywordsToSearch} keyword coverage` },
        education_certs: { score: eduCertScore, max: 10, details: parsed.sections.education ? 'Education validated' : 'Needs clearer education header' },
        role_evidence: { score: actionVerbBonus, max: 10, details: `${parsed.metrics.actionVerbsFound.length} strong action verbs identified` }
      },
      resume_quality: {
        section_completeness: { score: sectionScore, max: 30, details: `${Math.round((sectionScore / 30) * 100)}% standard sections populated` },
        action_verbs_metrics: { score: impactScore, max: 25, details: `${parsed.metrics.quantifiedMetricsCount} quantified metrics found` },
        formatting_readability: { score: formatScore, max: 25, details: `${parsed.metrics.wordCount} words, ${parsed.metrics.bulletCount} bullet items` },
        contact_presentation: { score: contactScore, max: 20, details: parsed.contact.email && parsed.contact.phone ? 'Email and phone verified' : 'Incomplete contact details' }
      }
    },
    strengths,
    missing_skills: missingSkills,
    section_feedback: sectionFeedback,
    formatting_warnings: formattingWarnings,
    recommendations,
    rubric_version: '1.0',
    disclaimer: 'This score is an automated estimation designed to benchmark resume readiness and ATS compliance. Actual applicant tracking systems and recruiters evaluate candidates through varied internal criteria.'
  };
}

/**
 * Main analysis entrypoint with optional AI enrichment (Google Gemini)
 */
export async function analyzeResume(params: {
  resumeText: string;
  parsedData: ParsedResumeData;
  targetCompany?: string;
  targetRole: string;
  jobDescription?: string;
  analysisMode: 'role_company' | 'job_description';
  userGeminiApiKey?: string;
}): Promise<ResumeAnalysisResult> {
  // Always compute deterministic baseline first to guarantee transparency and robustness
  const baseline = calculateAtsScores(params.parsedData, params.targetRole, params.jobDescription);

  const apiKey = params.userGeminiApiKey || process.env.GEMINI_API_KEY;

  // If Gemini API is available and non-test environment, enrich semantic insights
  if (apiKey && apiKey.trim().length > 0 && process.env.NODE_ENV !== 'test') {
    try {
      const prompt = `You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter analyzing a student's resume for a placement role.
Target Company: ${params.targetCompany || 'General Technical Hiring Partner'}
Target Role: ${params.targetRole}
Analysis Mode: ${params.analysisMode}
Job Description:
${params.jobDescription || 'Standard requirements for ' + params.targetRole}

Student Resume Extracted Text:
"""
${params.resumeText.slice(0, 3500)}
"""

Evaluate this resume strictly and return a JSON object with:
{
  "additional_strengths": ["string"],
  "tailored_recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "title": "string",
      "description": "string",
      "category": "string"
    }
  ],
  "role_alignment_summary": "string"
}
Output only valid JSON. Do not include markdown code block syntax if possible.`;

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(3500),
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1000
            }
          })
        }
      );

      if (aiResponse.ok) {
        const aiJson: any = await aiResponse.json();
        const rawText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsedAi = JSON.parse(cleaned);

          if (Array.isArray(parsedAi.additional_strengths)) {
            for (const s of parsedAi.additional_strengths.slice(0, 3)) {
              if (typeof s === 'string' && !baseline.strengths.includes(s)) {
                baseline.strengths.unshift(s);
              }
            }
          }

          if (Array.isArray(parsedAi.tailored_recommendations)) {
            for (const r of parsedAi.tailored_recommendations.slice(0, 2)) {
              if (r.title && r.description) {
                baseline.recommendations.unshift({
                  priority: r.priority || 'medium',
                  title: r.title,
                  description: r.description,
                  category: r.category || 'Role Alignment'
                });
              }
            }
          }
        }
      }
    } catch (aiErr) {
      // Deterministic baseline handles the analysis gracefully if AI fails
      console.warn('AI enrichment skipped or failed, using deterministic ATS engine:', aiErr);
    }
  }

  return baseline;
}
