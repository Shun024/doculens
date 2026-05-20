# 🔍 DocuLens

Full-stack RAG document intelligence application. Upload a document, ask questions in natural language, and get streaming answers with inline citations pointing to exact source passages — built with Next.js 14, TypeScript, and OpenAI.

---

## Features

- **Document ingestion** — upload `.txt` or `.md` files, automatically chunked and embedded
- **Streaming responses** — token-by-token streaming via Server-Sent Events
- **Inline citations** — every answer cites source chunks with relevance scores
- **Source panel** — click any citation to see the exact passage used
- **Cosine similarity search** — in-memory vector store, no external database needed
- **33 unit tests** — chunker, vector store, and pipeline logic fully tested

---

## Architecture

```
Document Upload (.txt / .md)
        │
        ▼
POST /api/ingest
├── chunkText() — sliding window, 512 tokens, 64 overlap
├── OpenAI text-embedding-3-small — embed all chunks
└── VectorStore.addChunks() — in-memory cosine similarity index
        │
        ▼
POST /api/query (Server-Sent Events)
├── Embed question → text-embedding-3-small
├── VectorStore.similaritySearch() → top-4 chunks
├── Build prompt with context + citation markers
└── Stream GPT-4o-mini response token by token
        │
        ▼
React Frontend
├── Drag-and-drop file upload
├── Streaming chat interface
├── Citation badges with relevance scores
└── Source context panel
```

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| LLM | GPT-4o-mini (streaming) |
| Embeddings | text-embedding-3-small |
| Vector search | In-memory cosine similarity |
| Testing | Jest + React Testing Library |

---

## Live Demo

**[doculens-6fr1me6hz-shun-le-yi-mons-projects.vercel.app](https://doculens-6fr1me6hz-shun-le-yi-mons-projects.vercel.app)**

---

## Live Demo

**[doculens-6fr1me6hz-shun-le-yi-mons-projects.vercel.app](https://doculens-6fr1me6hz-shun-le-yi-mons-projects.vercel.app)**

---

## Quickstart

```bash
git clone https://github.com/Shun024/doculens.git
cd doculens
npm install

# Add your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env.local

npm run dev
# Open http://localhost:3000
```

---

## Testing

```bash
npm test              # run all tests
npm run test:cov      # with coverage report
npm run typecheck     # TypeScript type check
```

**33 tests across:**
- `chunker.test.ts` — text splitting, token estimation, chunk structure
- `vectorStore.test.ts` — cosine similarity, search ranking, CRUD
- `ingest.test.ts` — pipeline logic, document storage

---

## Deploy to Vercel

```bash
npx vercel
# Add OPENAI_API_KEY in Vercel environment variables
```

---

## Author

**Shun Le Yi Mon (Sheryl)** · Data Scientist · NLP & GenAI  
[LinkedIn](https://linkedin.com/in/shunleyimon724) · [GitHub](https://github.com/Shun024)