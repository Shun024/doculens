/**
 * Unit tests for in-memory vector store.
 * Tests similarity search and document management.
 */

import { VectorStore } from "@/lib/vectorStore";
import type { DocumentChunk } from "@/lib/types";

// Helper to create a mock chunk with embedding
const makeChunk = (
  id: string,
  content: string,
  embedding: number[]
): DocumentChunk => ({
  id,
  content,
  embedding,
  metadata: {
    source: "test.txt",
    chunkIndex: parseInt(id),
    totalChunks: 5,
    startChar: 0,
    endChar: content.length,
  },
});

describe("VectorStore", () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  describe("addChunks", () => {
    it("adds chunks to the store", () => {
      const chunks = [
        makeChunk("0", "Financial risk assessment", [0.1, 0.2, 0.3]),
        makeChunk("1", "Machine learning models", [0.4, 0.5, 0.6]),
      ];
      store.addChunks("doc1", chunks);
      expect(store.getDocumentChunkCount("doc1")).toBe(2);
    });

    it("handles multiple documents", () => {
      store.addChunks("doc1", [makeChunk("0", "text1", [0.1, 0.2])]);
      store.addChunks("doc2", [makeChunk("1", "text2", [0.3, 0.4])]);
      expect(store.getDocumentChunkCount("doc1")).toBe(1);
      expect(store.getDocumentChunkCount("doc2")).toBe(1);
    });

    it("returns 0 for unknown document", () => {
      expect(store.getDocumentChunkCount("nonexistent")).toBe(0);
    });
  });

  describe("similaritySearch", () => {
    beforeEach(() => {
      const chunks = [
        makeChunk("0", "Financial risk in banking", [1.0, 0.0, 0.0]),
        makeChunk("1", "Machine learning for fraud", [0.0, 1.0, 0.0]),
        makeChunk("2", "Regulatory compliance Basel", [0.0, 0.0, 1.0]),
        makeChunk("3", "Credit scoring models", [0.7, 0.3, 0.0]),
        makeChunk("4", "Market volatility analysis", [0.5, 0.5, 0.0]),
      ];
      store.addChunks("doc1", chunks);
    });

    it("returns topK results", () => {
      const query = [1.0, 0.0, 0.0];
      const results = store.similaritySearch("doc1", query, 3);
      expect(results.length).toBe(3);
    });

    it("returns most similar chunk first", () => {
      const query = [1.0, 0.0, 0.0]; // similar to chunk 0
      const results = store.similaritySearch("doc1", query, 3);
      expect(results[0].chunk.id).toBe("0");
    });

    it("results have relevance scores", () => {
      const query = [1.0, 0.0, 0.0];
      const results = store.similaritySearch("doc1", query, 3);
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(-1);
        expect(r.score).toBeLessThanOrEqual(1);
      });
    });

    it("scores are in descending order", () => {
      const query = [1.0, 0.0, 0.0];
      const results = store.similaritySearch("doc1", query, 5);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it("returns empty array for unknown document", () => {
      const results = store.similaritySearch("nonexistent", [1, 0, 0], 3);
      expect(results).toEqual([]);
    });
  });

  describe("cosineSimilarity", () => {
    it("identical vectors have similarity 1", () => {
      const v = [0.5, 0.5, 0.5];
      const result = VectorStore.cosineSimilarity(v, v);
      expect(result).toBeCloseTo(1.0, 5);
    });

    it("orthogonal vectors have similarity 0", () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      const result = VectorStore.cosineSimilarity(v1, v2);
      expect(result).toBeCloseTo(0.0, 5);
    });

    it("opposite vectors have similarity -1", () => {
      const v1 = [1, 0, 0];
      const v2 = [-1, 0, 0];
      const result = VectorStore.cosineSimilarity(v1, v2);
      expect(result).toBeCloseTo(-1.0, 5);
    });

    it("handles zero vectors", () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 0, 0];
      const result = VectorStore.cosineSimilarity(v1, v2);
      expect(result).toBe(0);
    });
  });

  describe("removeDocument", () => {
    it("removes document chunks", () => {
      store.addChunks("doc1", [makeChunk("0", "text", [0.1, 0.2])]);
      store.removeDocument("doc1");
      expect(store.getDocumentChunkCount("doc1")).toBe(0);
    });

    it("does not affect other documents", () => {
      store.addChunks("doc1", [makeChunk("0", "text1", [0.1, 0.2])]);
      store.addChunks("doc2", [makeChunk("1", "text2", [0.3, 0.4])]);
      store.removeDocument("doc1");
      expect(store.getDocumentChunkCount("doc2")).toBe(1);
    });
  });
});