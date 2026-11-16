import { rm } from "node:fs/promises";

// Development type validators can retain routes that were deleted or renamed.
// A production build must generate its route types from the current source tree.
await rm(new URL("../.next", import.meta.url), { recursive: true, force: true });
