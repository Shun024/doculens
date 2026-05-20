/**
 * Integration tests for ingest logic.
 * Tests the core chunking and storage logic without NextRequest.
 */

import { chunkText } from "@/lib/chunker";
import { VectorStore } from "@/lib/vectorStore";
import { documentStore } from "@/lib/documentStore";

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: Array(20).fill({ embedding: Array(1536).fill(0.1) }),
      }),
    },
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({ choices: [] }),
      },
    },
  }))
);

describe("Ingest pipeline logic", () => {
  const store = new VectorStore();

  const sampleContent = `
    Financial risk management is a core competency for modern banks.
    Basel III introduced stricter capital requirements and liquidity standards.
    Credit risk, market risk, and operational risk must be carefully monitored.
    The FCA requires all UK financial institutions to maintain adequate capital buffers.
    Stress testing and scenario analysis are key tools for risk assessment.
  `.trim();

  it("chunks document into at least one chunk", () => {
    const chunks = chunkText(sampleContent, "report.txt");
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("chunks have valid structure", () => {
    const chunks = chunkText(sampleContent, "report.txt");
    chunks.forEach((chunk) => {
      expect(chunk.id).toBeDefined();
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.metadata.source).toBe("report.txt");
    });
  });

  it("stores chunks in vector store", () => {
    const chunks = chunkText(sampleContent, "report.txt");
    const withEmbeddings = chunks.map((c) => ({
      ...c,
      embedding: Array(1536).fill(0.1),
    }));
    store.addChunks("doc_test_001", withEmbeddings);
    expect(store.getDocumentChunkCount("doc_test_001")).toBeGreaterThan(0);
  });

  it("similarity search returns results after ingestion", () => {
    const chunks = chunkText(sampleContent, "report.txt");
    const withEmbeddings = chunks.map((c) => ({
      ...c,
      embedding: Array(1536).fill(0.1),
    }));
    store.addChunks("doc_test_002", withEmbeddings);
    const results = store.similaritySearch(
      "doc_test_002",
      Array(1536).fill(0.1),
      3
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it("document store persists ingested documents", () => {
    const chunks = chunkText(sampleContent, "report.txt");
    documentStore.set("doc_test_003", {
      id: "doc_test_003",
      name: "report.txt",
      size: sampleContent.length,
      chunks,
      uploadedAt: new Date(),
      status: "ready",
    });
    expect(documentStore.has("doc_test_003")).toBe(true);
    expect(documentStore.get("doc_test_003")?.name).toBe("report.txt");
  });

  it("document store returns undefined for unknown id", () => {
    expect(documentStore.get("nonexistent")).toBeUndefined();
  });

  it("empty content produces no chunks", () => {
    const chunks = chunkText("", "empty.txt");
    expect(chunks).toHaveLength(0);
  });

  it("chunks cover entire document", () => {
    const chunks = chunkText(sampleContent, "report.txt");
    const allContent = chunks.map((c) => c.content).join(" ");
    const words = sampleContent
      .split(/\s+/)
      .filter((w) => w.length > 5);
    words.forEach((word) => {
      expect(allContent).toContain(word);
    });
  });
});