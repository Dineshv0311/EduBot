import API_BASE_URL from './api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: 'gemini' | 'knowledge_base';
}

const SYSTEM_INSTRUCTION = `You are EduBot Helper, an AI Agent assistant integrated inside the EduBot AI Student Portal.
Your mission is to assist college students with placement preparation, portal navigation, and company-related queries.

EduBot AI Portal Knowledge Base:
1. Dashboard (/dashboard):
   - Real-time placement readiness analytics.
   - Summarizes total coding problems solved, accuracy rate, resume completeness, mock interview average score, and aptitude performance.
   - Generates personalized recommendations targeting weak areas (e.g., Dynamic Programming, System Design, Concurrency).

2. Coding Tracker (/coding):
   - Track coding problem-solving across LeetCode, HackerRank, CodeChef, and GeeksforGeeks.
   - Record problem title, topic/tags (Arrays, Strings, Trees, Graphs, DP, etc.), difficulty (Easy, Medium, Hard), status (Correct/Incorrect), and solution approach.
   - Helps students maintain consistency and build problem-solving streaks.

3. Resume Builder (/resume):
   - ATS-friendly placement resume builder.
   - Structured sections: Summary, Technical Skills, Projects, Education, Work Experience.
   - Automated ATS completeness score calculation and single-click high-fidelity PDF export.

4. Practice Hub (/practice):
   - Mock Interviews: Company-specific technical and behavioral questions (TechCorp Labs, FinTech Solutions), automated answer evaluation based on response depth and substance, score tracking.
   - Aptitude Tests: Timed assessments in Quantitative, Logical, and Verbal reasoning with multiple-choice questions, auto-grading, and performance analytics.

Company & Placement Insights:
- TechCorp Labs: Software & Cloud Enterprise platform. Top topics: Node.js Event Loop, Asynchronous Architecture, SQL Indexing trade-offs, Microservice debugging, and Behavioral problem-solving.
- FinTech Solutions: Financial Technology & High-Frequency APIs. Top topics: Distributed microservices data consistency, Database Concurrency Locking (Optimistic vs Pessimistic), System Design, ACID compliance.
- General Companies: Focus heavily on Data Structures & Algorithms, Core CS Fundamentals (DBMS, OS, Computer Networks), and project architectural defense.

Portal Issues & Troubleshooting:
- Scores not updating: Refresh the page, ensure test submission was finalized before timer expiration, or log out and back in to refresh JWT session.
- Resume export issue: Ensure all essential fields (Contact, Skills, Projects) are filled and browser popup blockers allow downloading PDF.
- Session expiration: JWT tokens expire periodically; re-login at /login to restore session.
- Admin support: Students can reach out to college placement administrators for departmental eligibility criteria or account escalations.

Style Guidelines:
- Respond in structured markdown using bullet points, numbered steps, or bold headers.
- Keep responses concise, supportive, actionable, and tailored to students preparing for campus placements.`;

// Client-side structured fallback knowledge responder
export function getLocalFallbackReply(message: string, studentName?: string): string {
  const query = message.toLowerCase();

  if (query.includes('techcorp') || (query.includes('tech') && query.includes('corp'))) {
    return `### 🏢 TechCorp Labs — Placement & Interview Guide

**Overview:** Global cloud enterprise platform specializing in software and cloud services.

**Key Technical Focus Areas:**
- **Node.js & Backend:** Event Loop, asynchronous I/O handling, and microservices architecture.
- **Databases:** SQL Indexing mechanics, query optimization, and execution plans.
- **Behavioral & System:** Architectural debugging methodology and incident resolution.

**Preparation Strategy:**
1. Practice mock interview questions in the **Practice Hub** under *TechCorp Labs*.
2. Review distributed systems and cloud architecture fundamentals.
3. Be ready to explain challenging bugs you have resolved in your projects.`;
  }

  if (query.includes('fintech') || query.includes('banking') || query.includes('trading')) {
    return `### 💳 FinTech Solutions — Placement & Interview Guide

**Overview:** Financial technology company building high-frequency trading platforms and banking APIs.

**Key Technical Focus Areas:**
- **Distributed Systems:** Data consistency across microservices (Saga pattern, 2PC, event-driven architecture).
- **Database Concurrency:** Optimistic vs. Pessimistic concurrency locking, isolation levels, and ACID properties.
- **High Performance:** Low-latency API design, caching strategies (Redis), and transaction safety.

**Preparation Strategy:**
1. Start a mock interview attempt in the **Practice Hub** under *FinTech Solutions*.
2. Master multi-threading, concurrency control, and transactional integrity.
3. Structure your responses with clear system design diagrams and trade-off analyses.`;
  }

  if (query.includes('coding') || query.includes('tracker') || query.includes('leetcode') || query.includes('hackerrank')) {
    return `### 💻 Coding Tracker Guide

The **Coding Tracker** helps you build discipline and track your problem-solving metrics across major platforms:

- **Log New Problems:** Record the problem title, platform (LeetCode, HackerRank, CodeChef, GFG), difficulty level, topic, and status (*Correct* or *Incorrect*).
- **Document Approaches:** Add key solution notes and time/space complexity analysis for future quick revision.
- **Analytics:** Feeds directly into your **Dashboard** readiness score and highlights weak algorithmic topics (e.g., DP, Graphs, Trees).`;
  }

  if (query.includes('resume') || query.includes('ats') || query.includes('pdf')) {
    return `### 📄 Resume Builder & ATS Score Optimization

The **Resume Builder** assists you in crafting a clean, ATS-compliant resume tailored for campus placements:

- **Key Sections:** Professional Summary, Education, Technical Skills, and Impactful Projects.
- **ATS Score Formula:** Completeness score is calculated dynamically based on your projects, technical skills, and clear role descriptions.
- **Exporting:** Click **Export to PDF** to generate an industry-formatted PDF via *html2pdf*.
- **Pro-Tip:** Use active action verbs (e.g., *Architected*, *Implemented*, *Optimized*) and quantify results with numbers (e.g., *Reduced latency by 35%*).`;
  }

  if (query.includes('mock interview') || query.includes('interview')) {
    return `### 🎯 Mock Interview Sessions

Practice real-world company interview questions in the **Practice Hub**:

1. **Select a Company:** Choose between *TechCorp Labs*, *FinTech Solutions*, or available hiring partners.
2. **Answer Prompts:** Type comprehensive, structured answers explaining both concepts and practical applications.
3. **Scoring Rubric:** Responses are scored based on depth, technical substance, and clarity (up to 100 per question).
4. **History:** View all past attempts, average scores, and track your performance progression over time.`;
  }

  if (query.includes('issue') || query.includes('bug') || query.includes('error') || query.includes('not working') || query.includes('problem') || query.includes('trouble') || query.includes('failed') || query.includes('score')) {
    return `### 🛠️ Troubleshooting & Issue Resolution

Here are the standard steps to resolve common portal issues:

- **Scores Not Updating:** Refresh your browser. If you just submitted an aptitude test or mock interview, ensure the submission succeeded before leaving the page.
- **Resume Export Issue:** Ensure you have filled out your summary, at least 1 project, and 3 skills. Also check that your browser did not block downloads.
- **Session Expired:** If API calls return unauthorized, log out using the top-right button and sign back in to refresh your JWT session.
- **Persistent Bug:** Contact your campus placement coordinator or administrator through the admin desk for account verification.`;
  }

  if (query.includes('aptitude') || query.includes('quiz') || query.includes('mcq') || query.includes('test')) {
    return `### 📝 Aptitude Test Preparation

The **Aptitude Section** in the Practice Hub helps you clear the first screening round of campus placements:

- **Categories:** Quantitative Aptitude, Logical Reasoning, and Verbal Ability.
- **Timed Assessment:** Simulates real recruitment time limits.
- **Instant Evaluation:** Immediate score breakdown and feedback upon submission.
- **Tips:** Manage your time per question and review incorrect responses to improve accuracy.`;
  }

  if (query.includes('dashboard') || query.includes('readiness') || query.includes('metric')) {
    return `### 📊 Dashboard & Placement Readiness

Your **Dashboard** aggregates data across all placement modules:

- **Total Solved:** Problems logged in the Coding Tracker with accuracy percentage.
- **Resume Score:** Completeness rating of your current resume draft.
- **Interview & Aptitude Scores:** Average and top performances from recent assessments.
- **AI Recommendations:** Highlights specific algorithmic and technical topics you should focus on next based on your submission history.`;
  }

  const greeting = studentName ? `Hello **${studentName}**!` : 'Hello!';
  return `### 👋 ${greeting} I'm your EduBot Placement & Portal Assistant

I am here to help you navigate EduBot AI and succeed in your campus placements. You can ask me about:

1. **🏢 Company Interview Guides:** Detailed expectations for *TechCorp Labs*, *FinTech Solutions*, and placement partners.
2. **💻 Coding Tracker:** How to track problems, review algorithmic topics, and boost your score.
3. **📄 Resume Builder:** Optimizing your ATS score, organizing technical projects, and exporting clean PDFs.
4. **🎯 Practice Hub:** Taking company mock interviews and timed aptitude assessments.
5. **⚠️ Portal Issues & Support:** Resolving score sync issues, submission queries, or session resets.

*Tip: Feel free to ask a specific query like "What does TechCorp Labs ask in interviews?" or "How do I increase my ATS score?"*`;
}

export async function askAiHelper(
  message: string,
  history: ChatMessage[],
  token: string | null,
  studentName?: string
): Promise<{ reply: string; source: 'gemini' | 'knowledge_base' }> {
  const customKey =
    localStorage.getItem('edubot_gemini_api_key') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    '';

  // 1. Try calling the EduBot Backend AI Helper Route
  if (token) {
    try {
      const res = await fetch(`${API_BASE_URL}/helper/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          apiKey: customKey.trim() || undefined,
          history: history.slice(-6).map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          return { reply: data.reply, source: data.source || 'gemini' };
        }
      }
    } catch {
      // Backend may be offline or unreachable, proceed to direct client options
    }
  }

  // 2. Direct client-side Gemini API invocation if custom key is present
  if (customKey && customKey.trim().length > 0) {
    try {
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      for (const m of history.slice(-6)) {
        contents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${customKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (res.ok) {
        const data = (await res.json()) as any;
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { reply: text, source: 'gemini' };
        }
      }
    } catch {
      // Fall through to local fallback
    }
  }

  // 3. Fallback to client-side structured knowledge base
  const localReply = getLocalFallbackReply(message, studentName);
  return { reply: localReply, source: 'knowledge_base' };
}
