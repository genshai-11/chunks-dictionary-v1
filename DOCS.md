# SYSTEM DOCUMENTATION

## 1. Current Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion (from `motion/react`)
- **Language**: TypeScript

### Backend
- **Server**: Node.js with Express
- **Language**: TypeScript (execution via `tsx` in dev, `esbuild` for production bundle)
- **Architecture**: Full-stack Next-Gen SSR/API Pattern (Vite middleware on Express)
- **Data Persistence**: Local JSON-based persistent storage (for prototype/beta phase)

### Integrations & Services
- **AI/LLM Engine**: Integration via API routes using `9router` for Google Gemini models and Custom Endpoint Support.
- **Audio TTS / STT**: Deep integration with AI models for text-to-speech (TTS) and speech-to-text (STT) capabilities.
- **External Data**: Google Sheets API proxy for bulk vocabulary import.

---

## 2. Completed Features & Tasks (Done)

### A. Teacher Dashboard
- **Vocabulary Management (CRUD)**: Create, list, edit, and delete vocabulary entries.
- **Color-Coding System**: Auto and manual classification (Gap Fillers, Sentence Frames, Idioms, Key Terms).
- **Batch Processing**:
  - **Batch Delete & Status Edit**: Multi-select vocabulary for bulk updates.
  - **Batch AI Example Generation**: Generate contextual examples for multiple words simultaneously.
  - **Batch TTS Audio**: Generate spoken audio files for multiple words or examples.
- **Google Sheets Bulk Import**: Secure proxy import of vocabulary lists directly from Google Sheets.
- **9Router Integration Settings**: UI for configuring LLM/TTS/STT endpoints, models, and API keys natively.
- **Audio Manager**: Centralized tab to track generated audio assets.
- **Recommendations Engine**: Pin/unpin specific vocabulary arrays into a "Classroom" collection for student view.

### B. Student Dashboard & Experience
- **Classroom Browser**: Search and explore the vocabulary dictionary.
- **Syntax Highlighting & Color Coding**: Visual cues mapping to structural English grammar conventions.
- **Voice Search**: Interact with the dictionary using Speech-to-Text capabilities.
- **Segment Parser (AI)**: Break down full complex sentences into logical chunks and categorize them.

### C. AI capabilities
- **Example Generation**: Three modes implemented (Full English, Code-Mixing, Both), specifying contexts tailored for Vietnamese learners/office workers.
- **Sentence Segmentation**: Intelligent chunking of sentences to identify core grammatical and idiomatic blocks.

---

## 3. Full Product Requirements Document (PRD) Scope

**Core Mission**: To build a contextual, bilingual (English-Vietnamese) dictionary and language learning application that heavily relies on "chunking", code-mixing, and AI-driven authentic context generation.

*The system currently fully satisfies the MVP logic defined for:*
1. **Teacher Curation**: Allowing educators to rapidly ingest (Sheets), process (AI batch examples), and dispatch (TTS) large volumes of vocabulary.
2. **Student Exploration**: Providing students with rich, color-coded, and audible contexts for how words weave into sentences, distinct against isolated rote-learning.
3. **Bilingual Authenticity**: Embracing "code-mixing" (e.g., using English phrases naturally in Vietnamese sentences) as a core feature of the AI engine.

---

## 4. Missing Features & Scalability Backlog

While the MVP is fully functional, the following architectural and structural components are missing for a production-grade release:

1. **Persistent Cloud Database (High Priority)**
   - *Current System*: Writes data directly to local filesystem files (e.g. `data/dictionaryStore.json`).
   - *Missing*: Migration to a scalable cloud database like **Firebase Firestore** or **Google Cloud SQL (PostgreSQL)** for distributed environments (Cloud Run).

2. **Authentication & Authorization (High Priority)**
   - *Current System*: Open-access; the toggle between Student and Teacher is an unauthenticated UI state.
   - *Missing*: Secure OAuth/JWT-based login (e.g., Firebase Auth or OAuth integration) with hard role-based access control (RBAC).

3. **Cloud Object/Blob Storage (Medium Priority)**
   - *Current System*: TTS generation either returns Base64 blobs directly to the client or caches locally. 
   - *Missing*: Integration with Google Cloud Storage or similar to store permanent TTS `audio/mp3` files via CDN.

4. **Analytics & Progress Tracking (Medium Priority)**
   - *Missing*: Tracking which vocabulary a specific student interacted with, time spent, or audio repetitions.

5. **Pagination & Indexing (Low Priority)**
   - *Missing*: UI virtualization or API pagination for dictionaries surpassing 10,000+ entries.

---

## 5. System Runbook

### Environment Variables (.env)
*Ensure these are defined in your secure environment or `.env` file before booting.*
\`\`\`env
# Local Port Allocation
PORT=3000

# Backend AI Keys (if falling back to direct server integrations instead of 9router client)
GEMINI_API_KEY=
\`\`\`

### Local Development Start
The project runs Vite inside an Express middleware harness.
\`\`\`bash
# 1. Install Dependencies
npm install

# 2. Run the Development Server
npm run dev
# The system will be available at http://localhost:3000
\`\`\`

### Production Build & Deployment
For Docker / Cloud Run deployments.
\`\`\`bash
# 1. Build the frontend boundaries (Vite) and backend bundle (esbuild)
npm run build

# 2. Start the compiled production server
npm run start
\`\`\`

### Maintenance & Debugging
- **Logs**: Batch operations, Google Sheet Import logic, and TTS fallback engines write directly to node standard `stdout`.
- **Local State Resets**: If the dictionary application breaks locally due to malformed data, flush the local persistent cache file the backend uses (the path depends on internal server.ts configuration).
- **Clearing localStorage**: For settings configuration, AI `9router` parameters are stored on `localStorage` in the browser. Clear browser storage if endpoints fail.
