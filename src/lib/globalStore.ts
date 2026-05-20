/**
 * Global singleton stores shared across API routes.
 * Uses globalThis to persist across hot reloads in development.
 */

import { VectorStore } from "./vectorStore";
import type { IngestedDocument } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __vectorStore: VectorStore | undefined;
  // eslint-disable-next-line no-var
  var __documentStore: Map<string, IngestedDocument> | undefined;
}

export const vectorStore: VectorStore =
  globalThis.__vectorStore ?? (globalThis.__vectorStore = new VectorStore());

export const documentStore: Map<string, IngestedDocument> =
  globalThis.__documentStore ??
  (globalThis.__documentStore = new Map<string, IngestedDocument>());