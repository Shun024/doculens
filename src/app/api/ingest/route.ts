/**
 * POST /api/ingest
 * Ingests a document: chunks text, generates embeddings, stores in vector store.
 * Returns documentId for subsequent queries.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { chunkText } from "@/lib/chunker";
import { vectorStore, documentStore } from "@/lib/globalStore";
import type { IngestRequest, IngestResponse } from "@/lib/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body: IngestRequest = await req.json();

    if (!body.fileName || !body.content) {
      return NextResponse.json(
        { error: "fileName and content are required" },
        { status: 400 }
      );
    }

    if (body.content.trim().length === 0) {
      return NextResponse.json(
        { error: "Document content cannot be empty" },
        { status: 400 }
      );
    }

    // Chunk the document
    const chunks = chunkText(body.content, body.fileName);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from document" },
        { status: 422 }
      );
    }

    // Generate embeddings for all chunks
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks.map((c) => c.content),
    });

    // Attach embeddings to chunks
    const embeddedChunks = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddingResponse.data[i].embedding,
    }));

    // Generate document ID and store
    const documentId = `doc_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    vectorStore.addChunks(documentId, embeddedChunks);
    documentStore.set(documentId, {
      id: documentId,
      name: body.fileName,
      size: body.content.length,
      chunks: embeddedChunks,
      uploadedAt: new Date(),
      status: "ready",
    });

    const response: IngestResponse = {
      documentId,
      chunkCount: chunks.length,
      status: "ready",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Ingest error:", error);
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    );
  }
}