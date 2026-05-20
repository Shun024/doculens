/**
 * POST /api/query
 * Streams an answer to a question about an ingested document.
 * Returns: streaming text + citations metadata.
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { vectorStore, documentStore } from "@/lib/globalStore";
import type { Citation, QueryRequest } from "@/lib/types";


function buildPrompt(question: string, contextChunks: string[]): string {
  const context = contextChunks
    .map((chunk, i) => `[${i + 1}] ${chunk}`)
    .join("\n\n");

  return `You are a precise document analyst. Answer the question using ONLY the provided context.
If the answer is not in the context, say "I cannot find this information in the document."
Always cite your sources using [1], [2], etc. notation.

Context:
${context}

Question: ${question}

Answer:`;
}

export async function POST(req: NextRequest): Promise<Response> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body: QueryRequest = await req.json();

    if (!body.question || !body.documentId) {
      return NextResponse.json(
        { error: "question and documentId are required" },
        { status: 400 }
      );
    }

    const document = documentStore.get(body.documentId);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Embed the question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: body.question,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Retrieve top-k chunks
    const topK = body.topK ?? 4;
    const searchResults = vectorStore.similaritySearch(
      body.documentId,
      queryEmbedding,
      topK
    );

    if (searchResults.length === 0) {
      return NextResponse.json(
        { error: "No relevant content found" },
        { status: 422 }
      );
    }

    // Build citations metadata
    const citations: Citation[] = searchResults.map((r) => ({
      chunkId: r.chunk.id,
      content: r.chunk.content,
      relevanceScore: Math.round(r.score * 100) / 100,
      chunkIndex: r.chunk.metadata.chunkIndex,
      source: r.chunk.metadata.source,
    }));

    // Stream the answer
    const prompt = buildPrompt(
      body.question,
      searchResults.map((r) => r.chunk.content)
    );

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      max_tokens: 800,
      temperature: 0.1,
    });

    // Return streaming response with citations in header
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // First send citations as a JSON line
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "citations", citations })}\n\n`
          )
        );

        // Stream answer tokens
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content ?? "";
          if (token) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: token })}\n\n`
              )
            );
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      { error: "Failed to process query" },
      { status: 500 }
    );
  }
}