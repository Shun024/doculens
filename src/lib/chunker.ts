/**
 * DocuLens Text Chunker
 * Splits documents into overlapping chunks for RAG retrieval.
 */

import type { DocumentChunk } from "./types";

const CHARS_PER_TOKEN = 4;

function generateId(source: string, index: number): string {
  return `${source}-chunk-${index}-${Date.now()}`;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function chunkText(
  text: string,
  source: string,
  maxTokens: number = 512,
  overlapTokens: number = 64
): DocumentChunk[] {
  if (!text.trim()) return [];

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  const chunks: DocumentChunk[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const content = text.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        id: generateId(source, chunks.length),
        content,
        metadata: {
          source,
          chunkIndex: chunks.length,
          totalChunks: 0,
          startChar: start,
          endChar: end,
        },
      });
    }

    if (end >= text.length) break;
    start = end - overlapChars;
  }

  const total = chunks.length;
  return chunks.map((c) => ({
    ...c,
    metadata: { ...c.metadata, totalChunks: total },
  }));
}