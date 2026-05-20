/**
 * DocuLens — Main Application Page
 * Document upload + RAG-powered Q&A with streaming + citations
 */

"use client";

import { useState, useRef, useCallback } from "react";

interface Citation {
  chunkId: string;
  content: string;
  relevanceScore: number;
  chunkIndex: number;
  source: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
}

interface DocumentState {
  id: string;
  name: string;
  chunkCount: number;
  status: "ready";
}

export default function Home() {
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, content: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setDocument({ id: data.documentId, name: file.name, chunkCount: data.chunkCount, status: "ready" });
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `✅ **${file.name}** ingested — ${data.chunkCount} chunks indexed. Ask me anything about this document.`,
      }]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleQuery = async () => {
    if (!input.trim() || !document || isQuerying) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsQuerying(true);
    setTimeout(scrollToBottom, 100);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, documentId: document.id }),
      });

      if (!res.ok) throw new Error("Query failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "citations") {
              citations = event.citations;
            } else if (event.type === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
            } else if (event.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, isStreaming: false, citations }
                    : m
                )
              );
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, something went wrong. Please try again.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsQuerying(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">D</div>
            <div>
              <h1 className="font-semibold text-sm">DocuLens</h1>
              <p className="text-xs text-gray-500">RAG Document Intelligence</p>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <div className="p-4 border-b border-gray-800">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-900 transition-colors"
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400">Processing...</p>
              </div>
            ) : (
              <>
                <p className="text-2xl mb-1">📄</p>
                <p className="text-xs text-gray-400">Drop a .txt or .pdf file</p>
                <p className="text-xs text-gray-600 mt-1">or click to browse</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
          {uploadError && (
            <p className="text-xs text-red-400 mt-2">{uploadError}</p>
          )}
        </div>

        {/* Document info */}
        {document && (
          <div className="p-4 border-b border-gray-800">
            <p className="text-xs text-gray-500 mb-1">Active Document</p>
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-200 truncate">{document.name}</p>
              <p className="text-xs text-gray-500 mt-1">{document.chunkCount} chunks indexed</p>
              <div className="flex items-center gap-1 mt-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <p className="text-xs text-green-400">Ready</p>
              </div>
            </div>
          </div>
        )}

        {/* Citation panel */}
        {selectedCitation && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-medium text-gray-400">Source Context</p>
              <button onClick={() => setSelectedCitation(null)} className="text-xs text-gray-600 hover:text-gray-400">✕</button>
            </div>
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="flex justify-between mb-2">
                <span className="text-xs text-blue-400">Chunk {selectedCitation.chunkIndex + 1}</span>
                <span className="text-xs text-gray-500">{Math.round(selectedCitation.relevanceScore * 100)}% match</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{selectedCitation.content}</p>
            </div>
          </div>
        )}

        {!selectedCitation && (
          <div className="flex-1 p-4">
            <p className="text-xs text-gray-600">
              {document ? "Ask a question to see source citations" : "Upload a document to get started"}
            </p>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">
              {document ? document.name : "No document loaded"}
            </h2>
            <p className="text-xs text-gray-500">
              {document ? "RAG-powered Q&A with source citations" : "Upload a document to begin"}
            </p>
          </div>
          {document && (
            <button
              onClick={() => { setDocument(null); setMessages([]); setSelectedCitation(null); }}
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-1 rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 flex items-center justify-center text-3xl mb-4">🔍</div>
              <h3 className="font-medium text-gray-300 mb-2">DocuLens</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Upload a document and ask questions. Get streaming answers with inline citations pointing to exact source passages.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-2 text-xs text-gray-600 max-w-xs">
                {["What are the main risk factors?", "Summarise the key findings", "What does Basel III require?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => document && setInput(q)}
                    className="border border-gray-800 rounded-lg px-3 py-2 hover:border-gray-600 hover:text-gray-400 text-left transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-2xl ${message.role === "user" ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-100"} rounded-2xl px-4 py-3`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                  {message.isStreaming && (
                    <span className="inline-block w-1 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                  )}
                </p>

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {message.citations.map((citation, i) => (
                        <button
                          key={citation.chunkId}
                          onClick={() => setSelectedCitation(
                            selectedCitation?.chunkId === citation.chunkId ? null : citation
                          )}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            selectedCitation?.chunkId === citation.chunkId
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400"
                          }`}
                        >
                          [{i + 1}] {Math.round(citation.relevanceScore * 100)}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuery();
                }
              }}
              placeholder={document ? "Ask a question about your document..." : "Upload a document first"}
              disabled={!document || isQuerying}
              rows={1}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
            />
            <button
              onClick={handleQuery}
              disabled={!input.trim() || !document || isQuerying}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors"
            >
              {isQuerying ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : "Send"}
            </button>
          </div>
          <p className="text-xs text-gray-700 mt-2 text-center">
            Powered by GPT-4o-mini · text-embedding-3-small · Next.js App Router
          </p>
        </div>
      </div>
    </div>
  );
}