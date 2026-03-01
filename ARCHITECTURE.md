# AI Assessment Creator - Technical Deep Dive

A comprehensive technical document for discussing the architecture, design decisions, and implementation details of the AI-powered assessment builder.

---

## Executive Summary

**What it does**: Transforms reference materials (documents, text) into AI-generated assessments with multiple choice and true/false questions using OpenAI's GPT-4o model.

**Key differentiators**:

- Real-time streaming of AI responses using Server-Sent Events (SSE)
- RAG (Retrieval-Augmented Generation) integration for intelligent context retrieval
- Granular regeneration (individual questions or specific answer options)
- Custom prompt injection for tailored question generation
- Full CRUD with draft/publish workflow

---

## Architecture Overview

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
│         │            └──────┬──────┘     └──────┬──────┘       │
│         │                   │                   │               │
│         │                   │            ┌──────▼──────┐       │
│         │                   │            │    RAG      │       │
│         │                   │◄───────────│   Service   │       │
│         │                   │            └──────┬──────┘       │
│         └─────────┬─────────┘                   │               │
│                   ▼                             │               │
│           ┌─────────────┐                       │               │
│           │   MongoDB   │                       │               │
│           │  (Mongoose) │                       │               │
│           └─────────────┘                       │               │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │ HTTP
┌─────────────────────────────────────────────────▼───────────────┐
│                      RAG Service (FastAPI)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Document   │  │  Embedding  │  │    Vector Search        │  │
│  │  Processor  │  │   Service   │  │    (Qdrant)             │  │
│  │ (PDF/DOCX)  │  │  (OpenAI)   │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │    PostgreSQL     │                        │
│                    │  (Document Store) │                        │
│                    └───────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack Decisions

### Frontend: React + Vite + Zustand

**Why React over Vue?**

- Team familiarity and larger ecosystem
- Better TypeScript support (future consideration)
- More straightforward state management patterns

**Why Zustand over Redux?**

- Minimal boilerplate - no actions, reducers, or action types
- Built-in async support without middleware
- Simple API: `const store = create((set, get) => ({...}))`
- ~1KB bundle size vs Redux's ~7KB

**Why Vite?**

- Instant HMR (Hot Module Replacement)
- Native ES modules in development
- 10-100x faster than Create React App

### Backend: Node.js + Express + MongoDB

**Why MongoDB?**

- Flexible schema for varying question types
- Easy embedding of subdocuments (options in questions)
- Mongoose ODM provides schema validation
- Good fit for document-heavy data

**Why Express?**

- Mature, stable, well-documented
- Excellent middleware ecosystem
- Easy SSE implementation with native `res.write()`

### AI: OpenAI GPT-4o

**Why GPT-4o?**

- Powerful multi-modal model - excellent at complex question generation
- Cost-effective for production use
- Supports streaming for real-time UX

**Model-specific considerations**:

```javascript
// GPT-4o configuration
{
  model: 'gpt-4o',
  max_tokens: 8000,
  temperature: 0.7,
  stream: true
}
```

### RAG: FastAPI + Qdrant + PostgreSQL

**Why RAG?**

- Large documents exceed LLM context limits
- Retrieval provides focused, relevant context
- Better question quality from targeted content
- Reduces token usage and costs

**RAG Architecture**:

- Pluggable RAG service for document processing
- Hybrid search (vector + keyword) for better retrieval
- Async processing for large documents
- OpenAI embeddings (text-embedding-3-large)

---

## Core Features Deep Dive

### 1. RAG Integration (Retrieval-Augmented Generation)

**Problem**: Passing entire documents to the LLM is inefficient and may exceed context limits.

**Solution**: Use a RAG service to extract relevant chunks before question generation.

**Flow**:

```
1. User uploads document
   → POST /api/upload/file
   → Document saved locally + sent to RAG service

2. RAG service processes asynchronously:
   → Parse document (PDF/DOCX/TXT)
   → Chunk text into segments
   → Generate embeddings (OpenAI text-embedding-3-large)
   → Store in Qdrant (vectors) + PostgreSQL (metadata)

3. Client polls for status:
   → GET /api/upload/:id/rag-status
   → UI shows "Processing document for AI retrieval..."

4. On question generation:
   → Query RAG service for relevant chunks
   → Pass focused context to GPT-4o (instead of full document)
```

**Server Implementation**:

```javascript
// ragService.js - Query for relevant context
export const getRelevantContext = async (fileId, query, topK = 20) => {
  const response = await fetch(`${RAG_API_URL}/api/v1/retrieval/query/doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection_name: fileId, // Document ID in RAG service
      query: query,
      k: topK,
    }),
  });

  const result = await response.json();
  return result.context; // Pre-formatted context string
};

// questionController.js - Use RAG context
const getReferenceText = async (referenceDocument, config, customPrompt) => {
  if (RAG_ENABLED && referenceDocument.ragStatus === 'ready') {
    const query = customPrompt ? `${customPrompt}. ${buildContextQuery(config)}` : buildContextQuery(config);

    const context = await getRelevantContext(referenceDocument.ragFileId, query, 20);

    if (context && context.length > 0) {
      console.log(`Using RAG context (${context.length} chars) instead of full document`);
      return context;
    }
  }

  // Fallback to full document text
  return referenceDocument.textContent;
};
```

**ReferenceDocument Schema** (with RAG fields):

```javascript
{
  sourceType: { type: String, enum: ['file_upload', 'text_paste'] },
  textContent: String,
  // RAG integration fields
  ragFileId: { type: String, default: null },      // RAG service document ID
  ragStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed', null],
    default: null
  },
  ragError: { type: String, default: null }
}
```

**Environment Variables**:
| Variable | Description | Default |
|----------|-------------|---------|
| `RAG_API_URL` | RAG service API endpoint | `http://localhost:8000` |
| `RAG_ENABLED` | Enable/disable RAG | `true` |

---

### 2. Real-Time Streaming with SSE

**Problem**: AI generation takes 10-30 seconds. Users need feedback.

**Solution**: Server-Sent Events (SSE) for real-time streaming.

**Server Implementation**:

```javascript
// Setup SSE headers
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// Stream chunks from OpenAI
for await (const chunk of openAIStream) {
  const content = chunk.choices[0]?.delta?.content || '';
  if (content) {
    res.write(`event: chunk\n`);
    res.write(`data: ${JSON.stringify({ content })}\n\n`);
  }
}

// Send final result
res.write(`event: complete\n`);
res.write(`data: ${JSON.stringify({ questions })}\n\n`);
res.end();
```

**Client Implementation**:

```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Parse SSE format
  const text = decoder.decode(value);
  // Handle event: chunk, event: complete, event: error
}
```

**Why SSE over WebSockets?**

- Simpler for unidirectional server→client streaming
- Works over HTTP/1.1 (no protocol upgrade)
- Automatic reconnection built into EventSource API
- Better for this use case (no bidirectional needed)

---

### 3. Custom Prompt Injection

**Problem**: Generic questions don't fit all use cases.

**Solution**: Allow users to inject custom instructions into the AI prompt.

**User Input**:

```
"Focus on practical applications, make questions challenging,
emphasize safety procedures from section 3"
```

**Prompt Construction**:

```javascript
export const buildQuestionGenerationPrompt = (config, referenceText, customPrompt) => {
  let customInstructions = '';
  if (customPrompt?.trim()) {
    customInstructions = `
Additional Instructions from User:
${customPrompt}
`;
  }

  return `You are an expert assessment creator...
${typeInstructions}
${customInstructions}  // <-- Injected here
Requirements:
1. Questions should test understanding...

Reference Material:
---
${referenceText}
---

Respond with valid JSON...`;
};
```

**Security Consideration**: User prompts are injected into a controlled template, not directly into system prompts. The AI is already instructed to output JSON only.

---

### 4. Granular Regeneration

**Problem**: Regenerating all questions wastes good ones.

**Solution**: Three levels of regeneration:

| Level           | Endpoint                                  | Use Case                 |
| --------------- | ----------------------------------------- | ------------------------ |
| All Questions   | `/questions/generate/stream`              | Start fresh              |
| Single Question | `/questions/:id/regenerate/stream`        | Replace one bad question |
| Single Answer   | `/questions/:id/regenerate-answer/stream` | Fix one incorrect option |

**Answer Regeneration Prompt**:

```javascript
`Generate a NEW answer option to replace one answer for the following question.

Question: ${questionText}
Current answer to replace (option B): "Paris"
This answer is: an incorrect distractor
Other answers (do not duplicate): London, Berlin, Madrid

Requirements:
1. Generate a single replacement answer
2. This should be a plausible but incorrect distractor
3. The answer should be different from all other options`;
```

---

### 5. Option ID Normalization

**Problem**: OpenAI doesn't consistently return `id` fields in options.

**Solution**: Normalize all options before database save.

```javascript
const normalizeOptions = (options) => {
  if (!options || !Array.isArray(options)) return [];
  return options.map((opt, index) => ({
    id: opt.id || String.fromCharCode(97 + index), // a, b, c, d...
    text: opt.text || '',
    isCorrect: opt.isCorrect || false,
  }));
};
```

**Applied in**:

- `generateQuestions` (new questions)
- `regenerateQuestion` (replaced questions)
- `regenerateAnswer` (individual option update)
- `updateQuestion` (manual edits)

---

## Data Flow Examples

### Creating an Assessment with RAG (Happy Path)

```
1. User fills config form (title, questionCount, type)

2. User uploads PDF
   → POST /api/upload/file
   → Document parsed locally (pdf-parse)
   → ReferenceDocument saved to MongoDB (ragStatus: 'pending')
   → Async: File sent to RAG service for processing

3. Client polls RAG status:
   → GET /api/upload/:id/rag-status
   → UI shows "Processing document for AI retrieval..."
   → Status changes: pending → processing → ready

4. User clicks "Generate Questions"
   → POST /api/assessments (create assessment)
   → POST /api/questions/generate/stream (SSE)

5. Server retrieves context from RAG service:
   → POST rag-service/api/v1/retrieval/query/doc
   → Returns relevant chunks (not full document)

6. Server streams to client:
   → event: chunk (JSON fragments)
   → event: chunk (more fragments)
   → ... (10-30 seconds)
   → event: complete (final questions array)

7. Questions saved to MongoDB
8. UI updates with generated questions
```

### Regenerating a Single Answer

```
1. User clicks refresh icon on answer "B"
2. Modal opens, user types: "Make it more plausible"

3. Client calls:
   → questionApi.regenerateAnswerStream(questionId, 1, "Make it more plausible")

4. Server:
   → Fetches question from DB
   → Queries RAG service for relevant context (using question text as query)
   → Builds prompt with current question context
   → Streams OpenAI response
   → Updates only options[1] in MongoDB
   → Returns updated question

5. UI updates single answer in place
```

---

## Database Schema Design

### Why Separate Question Documents?

**Option A**: Embed questions in Assessment

```javascript
// Embedded (rejected)
{
  title: "My Assessment",
  questions: [{ questionText: "...", options: [...] }]
}
```

**Option B**: Reference separate Question documents

```javascript
// Referenced (chosen)
{
  title: "My Assessment",
  questions: [ObjectId, ObjectId, ObjectId]
}
```

**Reasons for Option B**:

- Individual question updates don't rewrite entire assessment
- Can query questions independently
- Regeneration count tracked per question
- Better for future features (question banks, reuse)

### Mongoose Schema Definitions

```javascript
// Assessment Schema
{
  title: { type: String, required: true },
  description: String,
  configuration: {
    questionCount: { type: Number, required: true, min: 1, max: 50 },
    questionType: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'mixed'],
      required: true
    },
    answerOptionsCount: { type: Number, min: 2, max: 6, default: 4 }
  },
  referenceDocument: { type: Schema.Types.ObjectId, ref: 'ReferenceDocument' },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  metadata: {
    generatedAt: Date,
    generationModel: String,
    totalRegenerations: { type: Number, default: 0 }
  }
}

// Question Schema
{
  assessment: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true },
  order: { type: Number, required: true },
  type: { type: String, enum: ['multiple_choice', 'true_false'], required: true },
  questionText: { type: String, required: true },
  options: [{
    id: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true }
  }],
  correctAnswer: Boolean, // For true/false type
  explanation: String,
  regenerationCount: { type: Number, default: 0 },
  isManuallyEdited: { type: Boolean, default: false }
}

// ReferenceDocument Schema
{
  sourceType: { type: String, enum: ['file_upload', 'text_paste'], required: true },
  file: {
    originalName: String,
    mimeType: String,
    size: Number,
    path: String
  },
  textContent: { type: String, required: true },
  characterCount: Number,
  wordCount: Number,
  // RAG integration
  ragFileId: { type: String, default: null },
  ragStatus: { type: String, enum: ['pending', 'processing', 'ready', 'failed', null] },
  ragError: { type: String, default: null }
}
```

---

## Error Handling Strategy

### OpenAI-Specific Errors

```javascript
// OpenAI models can exhaust tokens during generation
if (!content && response.choices[0]?.finish_reason === 'length') {
  throw new Error('Response truncated - model ran out of tokens');
}

// Empty response detection
if (!content || content.trim() === '') {
  throw new Error('OpenAI returned an empty response');
}

// JSON extraction from potentially messy output
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  return JSON.parse(jsonMatch[0]);
}
```

### RAG Fallback Strategy

```javascript
// If RAG fails or isn't ready, fall back to full document
const getReferenceText = async (referenceDocument, config, customPrompt) => {
  if (RAG_ENABLED && referenceDocument.ragStatus === 'ready') {
    try {
      const context = await getRelevantContext(referenceDocument.ragFileId, query, 20);
      if (context && context.length > 0) {
        return context; // Use RAG context
      }
    } catch (error) {
      console.warn('RAG retrieval failed, falling back to full text:', error.message);
    }
  }

  // Fallback to full document text
  return referenceDocument.textContent;
};
```

### Client-Side Error Handling

```javascript
// Zustand store pattern
try {
  const result = await apiCall();
  set({ data: result, loading: false });
} catch (error) {
  set({
    error: error.response?.data?.error || error.message || 'Unknown error',
    loading: false,
  });
  throw error; // Re-throw for component-level handling
}
```

### SSE Error Recovery

```javascript
// Stream includes error events
if (currentEvent === 'error') {
  onError(new Error(data.message));
}

// AbortController for cancellation
const controller = new AbortController();
fetch(url, { signal: controller.signal });
// User can call abort: controller.abort()
```

---

## Performance Considerations

### Token Budget Management

| Operation           | max_completion_tokens | Reasoning                         |
| ------------------- | --------------------- | --------------------------------- |
| Generate Questions  | 8000                  | Multiple questions + explanations |
| Regenerate Question | 4000                  | Single question + options         |
| Regenerate Answer   | 2000                  | Single text string                |

### RAG Benefits

| Scenario        | Without RAG                     | With RAG                     |
| --------------- | ------------------------------- | ---------------------------- |
| 50-page PDF     | ~100k tokens (full doc)         | ~5k tokens (relevant chunks) |
| Context quality | Diluted by irrelevant content   | Focused on relevant sections |
| Response time   | Slower (more tokens to process) | Faster                       |
| Cost            | Higher                          | Lower                        |

### Database Indexing

```javascript
// Recommended indexes
assessmentSchema.index({ status: 1 });
assessmentSchema.index({ createdAt: -1 });
questionSchema.index({ assessment: 1, order: 1 });
referenceDocumentSchema.index({ ragStatus: 1 });
```

### Client-Side Optimizations

- **Zustand** avoids unnecessary re-renders (selector-based subscriptions)
- **Streaming** provides perceived performance improvement
- **Abort controller** prevents orphaned requests
- **RAG status polling** with cleanup on unmount

---

## Security Considerations

### Input Validation

- File uploads restricted to PDF, DOCX, TXT
- File size limits via Multer
- Question count limited to 1-50
- Answer options limited to 2-6

### Prompt Injection Mitigation

- User prompts inserted into controlled template
- AI instructed to output JSON only
- No system prompt manipulation possible

### API Security (Production Recommendations)

```javascript
// Not yet implemented, but recommended:
- Rate limiting (express-rate-limit)
- Input sanitization (express-validator)
- CORS configuration
- Helmet.js for security headers
- Authentication/Authorization
```

---

## API Endpoints

### Assessments

| Method | Endpoint                       | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| GET    | `/api/assessments`             | List all assessments          |
| GET    | `/api/assessments/:id`         | Get assessment with questions |
| POST   | `/api/assessments`             | Create new assessment         |
| PUT    | `/api/assessments/:id`         | Update assessment             |
| DELETE | `/api/assessments/:id`         | Delete assessment             |
| PATCH  | `/api/assessments/:id/publish` | Publish assessment            |

### Questions

| Method | Endpoint                                      | Description               |
| ------ | --------------------------------------------- | ------------------------- |
| POST   | `/api/questions/generate/stream`              | Generate questions (SSE)  |
| POST   | `/api/questions/:id/regenerate/stream`        | Regenerate question (SSE) |
| POST   | `/api/questions/:id/regenerate-answer/stream` | Regenerate answer (SSE)   |
| PUT    | `/api/questions/:id`                          | Update question manually  |
| DELETE | `/api/questions/:id`                          | Delete question           |

### Upload

| Method | Endpoint                     | Description               |
| ------ | ---------------------------- | ------------------------- |
| POST   | `/api/upload/file`           | Upload PDF/DOCX/TXT file  |
| POST   | `/api/upload/text`           | Submit pasted text        |
| GET    | `/api/upload/:id/rag-status` | Get RAG processing status |

---

## Future Enhancement Ideas

1. **Question Banks**: Save generated questions for reuse across assessments
2. **Difficulty Levels**: AI-detected or user-tagged difficulty ratings
3. **Multi-language Support**: Generate questions in different languages
4. **Analytics**: Track which questions are frequently regenerated
5. **Collaboration**: Multiple users editing same assessment
6. **Export Formats**: PDF, SCORM, QTI export
7. **Image Questions**: Support for image-based questions
8. **Batch Operations**: Generate multiple assessments from one document

---

## Talking Points for Discussion

### "Why did you choose this architecture?"

- Separation of concerns (controller/service/model)
- Streaming for UX during long AI operations
- RAG for efficient context retrieval from large documents
- Granular regeneration to preserve good content
- Document-based DB for flexible question structures

### "How does the RAG integration work?"

- Documents uploaded to RAG service for async processing
- RAG service chunks documents and generates embeddings (OpenAI text-embedding-3-large)
- Chunks stored in Qdrant (vector DB) + PostgreSQL (metadata)
- On question generation, we query RAG service for relevant chunks
- Only relevant context (~5k tokens) sent to GPT-4o instead of full document (~100k tokens)
- Graceful fallback to full document if RAG unavailable

### "How does the streaming work?"

- OpenAI SDK supports async iteration over streamed responses
- Server uses SSE (Server-Sent Events) to push chunks to client
- Client uses ReadableStream API to process chunks
- Final JSON parsed and saved after complete response

### "What were the biggest challenges?"

- Handling different OpenAI model configurations
- Token budget management during generation
- Consistent option ID generation from unpredictable AI output
- SSE implementation with proper event parsing
- Coordinating async RAG processing with client polling

### "How would you scale this?"

- Horizontal scaling of Node.js servers (stateless)
- MongoDB replica sets for read scaling
- Redis for session/cache if auth added
- Queue system (Bull/BullMQ) for async generation jobs
- CDN for static assets
- RAG service supports parallel file processing

### "What would you do differently?"

- Add TypeScript from the start
- Implement proper authentication early
- Add comprehensive error boundary components
- Set up proper logging (Winston/Pino)
- Add unit and integration tests
