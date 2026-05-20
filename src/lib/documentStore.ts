/**
 * In-memory document store.
 * In production this would be a database.
 */

import type { IngestedDocument } from "./types";

// Module-level singleton — persists across requests in same process
export const documentStore = new Map<string, IngestedDocument>();