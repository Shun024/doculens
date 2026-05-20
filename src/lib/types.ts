export interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: {
    source: string;
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
  };
}

export interface IngestedDocument {
  id: string;
  name: string;
  size: number;
  chunks: DocumentChunk[];
  uploadedAt: Date;
  status: "processing" | "ready" | "error";
}

export interface Citation {
  chunkId: string;
  content: string;
  relevanceScore: number;
  chunkIndex: number;
  source: string;
}

export interface QueryRequest {
  question: string;
  documentId: string;
  topK?: number;
}

export interface QueryResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  processingTimeMs: number;
}

export interface IngestRequest {
  fileName: string;
  content: string;
}

export interface IngestResponse {
  documentId: string;
  chunkCount: number;
  status: "ready" | "error";
  message?: string;
}