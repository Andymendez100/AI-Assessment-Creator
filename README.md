# 🎯 AI Assessment Creator

<div align="center">

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248?logo=mongodb&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwind-css&logoColor=white)

**Transform any document into AI-generated assessments in seconds**

[Features](#-features) • [Demo](#-demo) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Getting Started](#-getting-started)

</div>

---

## ✨ Features

### 🤖 AI-Powered Question Generation

- Generate multiple choice and true/false questions from any reference material
- Powered by OpenAI's latest GPT models with structured JSON output
- Custom generation instructions to tailor question difficulty and focus

### 🌊 Real-Time Streaming

- Watch questions being generated live with Server-Sent Events (SSE)
- Immediate visual feedback during the 10-30 second generation process
- No waiting for the entire response — see results as they're created

### 🎯 Granular Regeneration

- **Full Assessment**: Regenerate all questions at once
- **Single Question**: Replace just one question you don't like
- **Single Answer**: Fix individual answer options without touching the rest
- Custom prompts at each level for precise control

### 📚 RAG Integration (Retrieval-Augmented Generation)

- Large documents are chunked and embedded for intelligent retrieval
- Only relevant context is sent to the LLM (not the entire document)
- Reduces token usage by ~95% while improving question quality
- Asynchronous processing with status polling

### 📄 Multiple Input Methods

- **File Upload**: PDF, DOCX, TXT support with automatic text extraction
- **Text Paste**: Direct text input for quick assessments
- **Multi-Document**: Combine multiple sources into one assessment

### ✏️ Full Editing Control

- Edit any generated question, answer, or explanation
- Manual edits are preserved and tracked
- Draft/publish workflow for review before finalizing

---

## 🎬 Demo

<div align="center">

### Question Generation Flow

```
📄 Upload Document  →  ⚙️ Configure  →  🤖 Generate  →  ✏️ Review & Edit  →  📋 Publish
```

</div>

**Key User Journeys:**

1. **Quick Assessment**: Paste text → Set question count → Generate → Done
2. **Document-Based**: Upload PDF → AI extracts relevant content via RAG → High-quality questions
3. **Iterative Refinement**: Generate → Regenerate weak questions → Fine-tune answers → Publish

---

## 🛠 Tech Stack

### Frontend

| Technology       | Purpose                               |
| ---------------- | ------------------------------------- |
| **React 18**     | UI components with hooks              |
| **Vite**         | Lightning-fast dev server & builds    |
| **Tailwind CSS** | Utility-first styling with dark theme |
| **Zustand**      | Minimal state management (~1KB)       |
| **React Router** | Client-side routing                   |

### Backend

| Technology              | Purpose                        |
| ----------------------- | ------------------------------ |
| **Node.js + Express**   | REST API server                |
| **MongoDB + Mongoose**  | Document database with ODM     |
| **OpenAI SDK**          | GPT integration with streaming |
| **Multer**              | File upload handling           |
| **pdf-parse + mammoth** | Document text extraction       |

### AI/ML

| Technology            | Purpose                       |
| --------------------- | ----------------------------- |
| **GPT-4o**            | Question generation           |
| **RAG Pipeline**      | Intelligent context retrieval |
| **Vector Embeddings** | Semantic document search      |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │  Components │  │     Zustand Store       │  │
│  │ - Home      │  │ - Questions │  │ - assessments[]         │  │
│  │ - Create    │  │ - Config    │  │ - currentAssessment     │  │
│  │ - Edit      │  │ - Reference │  │ - streamingContent      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │    API Client     │                        │
│                    │ - Axios (REST)    │                        │
│                    │ - Fetch (SSE)     │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP/SSE
┌──────────────────────────────┼──────────────────────────────────┐
│                         SERVER (Node.js)                        │
│                    ┌─────────▼─────────┐                        │
│                    │   Express Router  │                        │
│                    └─────────┬─────────┘                        │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │ Assessment  │     │  Question   │     │   Upload    │       │
│  │ Controller  │     │ Controller  │     │ Controller  │       │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘       │
│         │                   │                   │               │
│         │            ┌──────▼──────┐     ┌──────▼──────┐       │
│         │            │   OpenAI    │     │  Document   │       │
│         │            │   Service   │     │   Parser    │       │
│         │            │ (Streaming) │     │ (PDF/DOCX)  │       │
│         │            └──────┬──────┘     └─────────────┘       │
│         └─────────┬─────────┘                                   │
│                   ▼                                             │
│           ┌─────────────┐         ┌─────────────────┐          │
│           │   MongoDB   │         │   RAG Service   │          │
│           │  (Mongoose) │         │ (Vector Search) │          │
│           └─────────────┘         └─────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision                        | Rationale                                                    |
| ------------------------------- | ------------------------------------------------------------ |
| **SSE over WebSockets**         | Simpler for unidirectional streaming, automatic reconnection |
| **Zustand over Redux**          | Minimal boilerplate, built-in async, 7x smaller bundle       |
| **Separate Question documents** | Granular updates, regeneration tracking, future reuse        |
| **RAG for large docs**          | 95% token reduction, better context focus, lower costs       |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-assessment-creator.git
cd ai-assessment-creator

# Install server dependencies
cd server
npm install

# Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY and MONGODB_URI

# Install client dependencies
cd ../client
npm install
```

### Development

```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start client
cd client
npm run dev

# Open http://localhost:5173
```

### Environment Variables

| Variable         | Description                    | Required |
| ---------------- | ------------------------------ | -------- |
| `MONGODB_URI`    | MongoDB connection string      | ✅       |
| `OPENAI_API_KEY` | OpenAI API key                 | ✅       |
| `OPENAI_MODEL`   | Model to use (default: gpt-4o) | ❌       |
| `RAG_API_URL`    | RAG service endpoint           | ❌       |
| `RAG_ENABLED`    | Enable RAG integration         | ❌       |
| `PORT`           | Server port (default: 3001)    | ❌       |

---

## 📡 API Endpoints

### Assessments

| Method   | Endpoint                       | Description                   |
| -------- | ------------------------------ | ----------------------------- |
| `GET`    | `/api/assessments`             | List all assessments          |
| `GET`    | `/api/assessments/:id`         | Get assessment with questions |
| `POST`   | `/api/assessments`             | Create new assessment         |
| `PUT`    | `/api/assessments/:id`         | Update assessment             |
| `DELETE` | `/api/assessments/:id`         | Delete assessment             |
| `PATCH`  | `/api/assessments/:id/publish` | Publish assessment            |

### Questions (SSE Streaming)

| Method   | Endpoint                                      | Description                |
| -------- | --------------------------------------------- | -------------------------- |
| `POST`   | `/api/questions/generate/stream`              | Generate questions (SSE)   |
| `POST`   | `/api/questions/:id/regenerate/stream`        | Regenerate single question |
| `POST`   | `/api/questions/:id/regenerate-answer/stream` | Regenerate single answer   |
| `PUT`    | `/api/questions/:id`                          | Manual edit                |
| `DELETE` | `/api/questions/:id`                          | Delete question            |

### Upload

| Method | Endpoint                     | Description                 |
| ------ | ---------------------------- | --------------------------- |
| `POST` | `/api/upload/file`           | Upload PDF/DOCX/TXT         |
| `POST` | `/api/upload/text`           | Submit pasted text          |
| `GET`  | `/api/upload/:id/rag-status` | Check RAG processing status |

---

## 📊 Database Schema

```javascript
// Assessment
{
  title: String,
  description: String,
  configuration: {
    questionCount: Number,      // 1-50
    questionType: 'multiple_choice' | 'true_false' | 'mixed',
    answerOptionsCount: Number  // 2-6
  },
  referenceDocuments: [ObjectId],
  questions: [ObjectId],
  status: 'draft' | 'published' | 'archived'
}

// Question
{
  assessment: ObjectId,
  type: 'multiple_choice' | 'true_false',
  questionText: String,
  options: [{ id: String, text: String, isCorrect: Boolean }],
  explanation: String,
  regenerationCount: Number,
  isManuallyEdited: Boolean
}
```

---

## 🔧 Technical Highlights

### Streaming Implementation

```javascript
// Server: Stream OpenAI chunks to client via SSE
for await (const chunk of openAIStream) {
  const content = chunk.choices[0]?.delta?.content || '';
  res.write(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`);
}

// Client: Process stream with ReadableStream API
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Parse and display chunks in real-time
}
```

### RAG Context Retrieval

```javascript
// Instead of sending 100k tokens (full document)
// Query RAG for relevant chunks (~5k tokens)
const context = await ragService.getRelevantContext(docId, query, topK);
```

---

## 📝 License

MIT

---

<div align="center">

**Built with ❤️ using React, Node.js, and OpenAI**

</div>
