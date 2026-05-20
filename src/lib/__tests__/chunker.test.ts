/**
 * Unit tests for document chunking.
 * Fast, no I/O, no API calls.
 */

import { chunkText, estimateTokens } from "@/lib/chunker";

describe("estimateTokens", () => {
  it("estimates tokens for short text", () => {
    const tokens = estimateTokens("Hello world");
    expect(tokens).toBeGreaterThan(0);
    expect(typeof tokens).toBe("number");
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("longer text has more tokens than shorter", () => {
    const short = estimateTokens("Hello");
    const long = estimateTokens("Hello world this is a longer sentence");
    expect(long).toBeGreaterThan(short);
  });
});

describe("chunkText", () => {
  const sampleText = `
    Artificial intelligence (AI) is transforming the financial services industry.
    Machine learning models are being deployed for fraud detection, credit scoring,
    and algorithmic trading. Natural language processing enables banks to analyse
    vast amounts of unstructured data including news, reports, and regulatory filings.
    Risk management teams use AI to identify emerging threats and model complex scenarios.
    The adoption of AI in finance raises important questions about explainability,
    fairness, and regulatory compliance. Financial institutions must balance innovation
    with robust governance frameworks to ensure responsible AI deployment.
  `.trim();

  it("returns at least one chunk for non-empty text", () => {
    const chunks = chunkText(sampleText, "test.txt");
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("each chunk has required fields", () => {
    const chunks = chunkText(sampleText, "test.txt");
    chunks.forEach((chunk) => {
      expect(chunk.id).toBeDefined();
      expect(chunk.content).toBeDefined();
      expect(chunk.metadata.source).toBe("test.txt");
      expect(chunk.metadata.chunkIndex).toBeGreaterThanOrEqual(0);
      expect(chunk.metadata.totalChunks).toBeGreaterThan(0);
    });
  });

  it("chunks have correct index sequence", () => {
    const chunks = chunkText(sampleText, "test.txt");
    chunks.forEach((chunk, i) => {
      expect(chunk.metadata.chunkIndex).toBe(i);
      expect(chunk.metadata.totalChunks).toBe(chunks.length);
    });
  });

  it("empty text returns empty array", () => {
    const chunks = chunkText("", "empty.txt");
    expect(chunks).toEqual([]);
  });

  it("chunk content is not empty", () => {
    const chunks = chunkText(sampleText, "test.txt");
    chunks.forEach((chunk) => {
      expect(chunk.content.trim().length).toBeGreaterThan(0);
    });
  });

  it("all text is covered by chunks", () => {
    const chunks = chunkText(sampleText, "test.txt");
    const combined = chunks.map((c) => c.content).join(" ");
    // Every significant word should appear somewhere
    const words = sampleText.split(/\s+/).filter((w) => w.length > 4);
    words.forEach((word) => {
      expect(combined).toContain(word);
    });
  });

  it("respects max chunk size", () => {
    const chunks = chunkText(sampleText, "test.txt", 100);
    chunks.forEach((chunk) => {
      expect(estimateTokens(chunk.content)).toBeLessThanOrEqual(150); // some tolerance
    });
  });

  it("generates unique chunk ids", () => {
    const chunks = chunkText(sampleText, "test.txt");
    const ids = chunks.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});