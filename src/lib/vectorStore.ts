/**
 * DocuLens In-Memory Vector Store
 * Stores document chunk embeddings and performs cosine similarity search.
 * No external database needed — embeddings stored in memory per session.
 */

import type { DocumentChunk } from "./types";

interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export class VectorStore {
  private store: Map<string, DocumentChunk[]> = new Map();

  addChunks(documentId: string, chunks: DocumentChunk[]): void {
    this.store.set(documentId, chunks);
  }

  getDocumentChunkCount(documentId: string): number {
    return this.store.get(documentId)?.length ?? 0;
  }

  removeDocument(documentId: string): void {
    this.store.delete(documentId);
  }

  similaritySearch(
    documentId: string,
    queryEmbedding: number[],
    topK: number = 5
  ): SearchResult[] {
    const chunks = this.store.get(documentId);
    if (!chunks || chunks.length === 0) return [];

    const results: SearchResult[] = chunks
      .filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
      .map((chunk) => ({
        chunk,
        score: VectorStore.cosineSimilarity(
          queryEmbedding,
          chunk.embedding!
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;

    return dot / denom;
  }
}