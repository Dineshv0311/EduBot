# 🎓 EduBot AI — Cloud-Native Placement & Mock Assessment Platform

**EduBot AI** is a cloud-native technical assessment and mock placement preparation platform. It delivers real-time test execution, granular student skill analytics, and algorithmic scoring engines.

The application follows a decoupled, microservices-ready architecture — containerized with multi-stage Docker builds and deployed across managed AWS infrastructure with automated GitHub Actions CI/CD pipelines.

---

## Table of Contents

- [Production Deployments](#-production-deployments)
- [System Architecture](#️-system-architecture)
- [DevOps & CI/CD Pipeline](#️-devops--cicd-pipeline-lifecycle)
- [Tech Stack](#-tech-stack--design-matrix)
- [Repository Structure](#-repository-file-structure)
- [Database Schema](#️-relational-database-schema)
- [API Specification](#-api-specification--contracts)
- [Local Development Setup](#️-local-development-setup)
- [Environment Configuration](#-environment-configuration)
- [Cloud Security & Governance](#️-cloud-security--operational-governance)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌐 Production Deployments

| Component | Target Infrastructure | Endpoint / Identifier | Status |
|---|---|---|---|
| **Frontend Web App** | AWS S3 Static Website Hosting | [edubot-ai-frontend-937206802465.s3-website.eu-north-1.amazonaws.com](http://edubot-ai-frontend-937206802465.s3-website.eu-north-1.amazonaws.com) | `Live / Active` |
| **REST API Gateway** | AWS EC2 (Elastic IP) | [13.51.54.37/api](http://13.51.54.37/api) | `Live / Active` |
| **Database Tier** | Amazon RDS (PostgreSQL 16) | `edubot-db.cdsgw0qi26h5.eu-north-1.rds.amazonaws.com:5432` | `VPC Isolated` |
| **Container Registry** | AWS Elastic Container Registry (ECR) | `937206802465.dkr.ecr.eu-north-1.amazonaws.com/edubot-backend` | `Private` |

---

## 🏛️ System Architecture

Production network topology, edge routing, application containers, and database layers:

```
[ Client Browser / Mobile ]
            │
            ├────────────────────────────────────────┐
            │ Static Asset Requests (HTTP/HTTPS)      │ API Requests (REST/JSON)
            ▼                                         ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│        AWS S3 Static Storage           │   │             AWS EC2 Instance            │
│   (edubot-ai-frontend-937206802465)    │   │        (Public Elastic IP: 13.51.54.37) │
│                                         │   │                                         │
│  - React 18 Single Page Application    │   │  ┌───────────────────────────────────┐  │
│  - Vite Compiled Bundles & Chunks      │   │  │       Docker Container Engine     │  │
│  - Asset Optimization & Caching        │   │  │   ┌───────────────────────────┐   │  │
└───────────────────────────────────────┘   │  │   │  Node.js / Express API    │   │  │
                                              │  │   │  - Port 80 → 5000 Proxy   │   │  │
                                              │  │   │  - Stateless Auth (JWT)   │   │  │
                                              │  │   │  - pg-pool Connection Hub │   │  │
                                              │  │   └─────────────┬─────────────┘   │  │
                                              │  └─────────────────┼─────────────────┘  │
                                              └────────────────────┼────────────────────┘
                                                                   │
                                                                   │ Encrypted SQL (Port 5432)
                                                                   ▼
                                              ┌─────────────────────────────────────────┐
                                              │            Amazon RDS Engine            │
                                              │     (PostgreSQL 16, Multi-AZ Ready)     │
                                              │                                         │
                                              │  - Relational Integrity Constraints     │
                                              │  - Parameterized Query Protection        │
                                              │  - Isolated Security Group Ingress       │
                                              └─────────────────────────────────────────┘
```

---

## ⚙️ DevOps & CI/CD Pipeline Lifecycle

Continuous integration and deployment run through isolated, branch-triggered GitHub Actions workflows. Every commit to `main` executes linting, build artifact verification, container baking, and a rolling deploy.

```
                    git push origin main
                              │
             ┌────────────────┴────────────────┐
             ▼                                  ▼
┌────────────────────────┐         ┌────────────────────────┐
│  frontend-deploy.yml    │         │  backend-deploy.yml     │
└────────────┬─────────────┘         └────────────┬─────────────┘
             │                                  │
             ├─► Checkout Code                  ├─► Checkout Code
             ├─► Node.js Setup (v20)            ├─► AWS Auth (ECR Session)
             ├─► Clean Install (npm ci)         ├─► Multi-stage Docker Build
             ├─► Vite Production Build          ├─► Push Image Tag to ECR
             └─► AWS S3 Sync (--delete)         └─► SSH Remote into EC2:
                                                       ├─► Pull Latest Image
                                                       ├─► Graceful Container Stop
                                                       └─► Auto-restart with Env Vars
```

---

## 📦 Tech Stack & Design Matrix

**Application Layer**
| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build engine | Vite (ESBuild bundler) |
| UI & icons | Tailwind CSS, Lucide React |
| HTTP client | Axios (interceptors + base URL config) |

**Backend & API Gateway**
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Web framework | Express.js (REST) |
| Authentication | JWT + bcrypt password hashing |
| Security & policy | Helmet, CORS, rate limiting |
| Data access | `pg` connection pool, parameterized SQL |

**Infrastructure & Orchestration**
| Layer | Technology |
|---|---|
| Cloud provider | Amazon Web Services (AWS) |
| Compute tier | AWS EC2 (Ubuntu 24.04 LTS, t3.micro) |
| Static hosting | AWS S3 website hosting bucket |
| Container registry | AWS Elastic Container Registry (ECR) |
| Database tier | AWS RDS for PostgreSQL |
| Automation | GitHub Actions, Docker Engine, Docker Compose |

---

## 📂 Repository File Structure

```text
edubot-ai/
├── .github/
│   └── workflows/
│       ├── frontend-deploy.yml        # S3 build & sync automation pipeline
│       └── backend-deploy.yml         # ECR bake & EC2 deploy SSH pipeline
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts            # PostgreSQL pool initialization
│   │   ├── controllers/
│   │   │   ├── authController.ts      # Authentication logic
│   │   │   └── testController.ts      # Mock assessment logic
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts      # JWT validation guards
│   │   │   └── errorHandler.ts        # Global exception handling
│   │   ├── routes/
│   │   │   ├── authRoutes.ts          # /api/auth routes
│   │   │   └── testRoutes.ts          # /api/tests routes
│   │   └── server.ts                  # Server bootstrap & middleware binding
│   ├── .dockerignore
│   ├── Dockerfile                     # Multi-stage production container build
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── assets/                    # Static images, icons, and themes
│   │   ├── components/                # Reusable UI component library
│   │   ├── pages/
│   │   │   ├── Login.tsx              # User authentication page
│   │   │   ├── Register.tsx           # User onboarding page
│   │   │   ├── Dashboard.tsx          # Analytics and metric tracking
│   │   │   └── Assessment.tsx         # Active test execution engine
│   │   ├── services/
│   │   │   └── api.ts                 # Centralized Axios client & routing
│   │   ├── App.tsx                    # Client-side routing engine
│   │   └── main.tsx                   # DOM mount bootstrap
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml                 # Local multi-service orchestration
├── schema.sql                         # Relational PostgreSQL DDL definitions
└── README.md                          # System documentation
```

---

## 🗄️ Relational Database Schema

Core relational design with foreign key constraints and performance indices:

```sql
-- Core Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Assessment Catalog
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    duration_minutes INT NOT NULL,
    total_marks INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Question Bank
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    assessment_id INT REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option VARCHAR(10) NOT NULL,
    marks INT DEFAULT 1
);

-- Submissions and Analytics
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    assessment_id INT REFERENCES assessments(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) NOT NULL,
    answers JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_questions_assessment_id ON questions(assessment_id);
```

---

## 🔌 API Specification & Contracts

All endpoints return uniform JSON envelopes with explicit HTTP status codes.

### Authentication Endpoints

**Register**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Alex Mercer",
  "email": "alex@university.edu",
  "password": "SecurePassword123!"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "alex@university.edu",
  "password": "SecurePassword123!"
}
```

### Assessment Endpoints

**List tests**
```http
GET /api/tests
Authorization: Bearer <JWT_TOKEN>
```

**Submit a test**
```http
POST /api/tests/submit
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "assessmentId": 12,
  "answers": [
    { "questionId": 101, "selectedOption": "A" },
    { "questionId": 102, "selectedOption": "C" }
  ]
}
```

---

## 🛠️ Local Development Setup

### Prerequisites

- **Node.js**: v20.x LTS or higher
- **Docker Desktop**: v24.x or higher
- **Git**: v2.x

### Method 1 — Containerized Development (Recommended)

Runs the frontend, backend API, and a local PostgreSQL instance in isolated containers with live reload:

```bash
# 1. Clone repository
git clone https://github.com/Dinesh0311/EduBot.git
cd EduBot

# 2. Launch multi-container environment
docker-compose up --build
```

Access points:
- **Frontend UI:** `http://localhost:5173`
- **Backend API:** `http://localhost:5000`
- **PostgreSQL:** `localhost:5432`

### Method 2 — Native Setup

**Backend:**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Frontend:**
```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

---

## 🔐 Environment Configuration

**Backend** (`./backend/.env`)
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edubot
JWT_SECRET=supersecretjwtkey_local_development_only
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`./frontend/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🛡️ Cloud Security & Operational Governance

- **IAM least privilege** — AWS credentials in GitHub Actions are scoped solely to S3 sync, ECR image push, and EC2 SSH deploy commands.
- **Network isolation** — the RDS PostgreSQL instance accepts connections only from the security group attached to the EC2 backend instance.
- **Cost controls** — AWS Zero-Spend Budget Alerts trigger notifications when resource usage approaches or exceeds free-tier limits.
- **Input sanitization** — all controller queries use parameterized SQL placeholders to prevent injection.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/assessment-analytics`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `git commit -m "feat: implement test duration tracker"`
4. Push your branch: `git push origin feature/assessment-analytics`
5. Open a Pull Request targeting `main`

---

## 📄 License

Licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
