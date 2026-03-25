# AGENTS.md

## Overview

OpenClaw Control Center is a TypeScript/Node.js application providing a local observability dashboard for OpenClaw. It uses strict TypeScript, CommonJS modules, and the built-in Node.js test runner.

## Project Structure

```
src/
├── index.ts           # Entry point
├── config.ts         # Environment configuration
├── types.ts          # Shared type definitions
├── adapters/         # OpenClaw client adapters
├── clients/          # Client factory
├── contracts/        # Type contracts
├── mappers/          # Data mappers
├── runtime/          # Business logic (39 modules)
└── ui/               # HTTP UI server

test/                 # 20+ test files using node:test
scripts/              # Utility scripts
runtime/              # Generated data (gitignored)
```

## Build Commands

```bash
# Build TypeScript
npm run build

# Run all tests
npm test

# Run single test file
node --import tsx --test test/usage-cost.test.ts

# Run tests matching a pattern (Node 20+)
node --import tsx --test --test-name-pattern="usage-cost" test/

# UI development
npm run dev:ui          # Start UI server (recommended)
npm run smoke:ui        # UI smoke test

# Development modes
npm run dev             # Single monitor pass
npm run dev:continuous  # Continuous monitoring

# Commands
npm run command:backup-export
npm run command:import-validate
npm run command:acks-prune
npm run command:task-heartbeat

# Validation scripts
npm run validate          # Validate task store and budget
npm run validate:task-store
npm run validate:budget

# Lock management
npm run lock:status
npm run lock:acquire
npm run lock:renew
npm run lock:release
```

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

**Key rules:**
- `strict: true` - all strict type checking enabled
- No `any` unless absolutely necessary
- Prefer `interface` over `type` for object shapes
- Use `type` for unions and primitives
- Use `satisfies` for type narrowing without widening

## Code Style Guidelines

### Imports

```typescript
// Node.js built-ins use node: prefix
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";

// Relative imports for local modules
import type { ReadModelSnapshot } from "../src/types";
import { buildExportBundle } from "./runtime/export-bundle";
```

### Naming Conventions

```typescript
// PascalCase for types, interfaces, classes
interface SessionSummary { }
type ConnectionStatus = "connected" | "not_connected";
class OpenClawReadonlyAdapter { }

// camelCase for functions and variables
function buildSnapshotFixture() { }
const sessionByKey = new Map();

// SCREAMING_SNAKE_CASE for constants
const RUNTIME_DIR = join(process.cwd(), "runtime");
const DAY_MS = 24 * 60 * 60 * 1000;

// Prefix unused variables with underscore
function handler(_req: Request, res: Response) { }
```

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface UsagePeriodSummary {
  key: "today" | "7d" | "30d";
  label: string;
  tokens: number;
  estimatedCost: number;
  requestCountStatus: ConnectionStatus;
}

// Use type for unions
type ConnectionStatus = "connected" | "partial" | "not_connected";
type UsageCostMode = "full" | "summary";

// Type guards and assertions
const obj = asObject(raw);
if (!usage) continue;
const date = asString(raw.date) ?? fileName.slice(0, -5);

// satisfies for narrowed type inference
return {
  sessionKey: status.sessionKey,
  thresholdState,
} satisfies SessionContextWindowSummary;
```

### Error Handling

```typescript
// Try/catch with instanceof checks
try {
  const data = await readFile(path, "utf8");
  return JSON.parse(data);
} catch (error) {
  if (isFsNotFound(error)) {
    return defaultValue;
  }
  throw error;
}

// Error message construction
throw new Error(
  `Unknown command '${input}'. Supported: backup-export, import-validate, acks-prune, task-heartbeat.`,
);

// Error context in audit logs
detail: error instanceof Error ? error.message : "backup export failed";
```

### Async Patterns

```typescript
// Prefer async/await
async function loadUsageDigests(): Promise<UsageDigest[]> {
  try {
    const files = await readdir(DIGEST_DIR);
    return files.filter((name) => name.endsWith(".json"));
  } catch {
    return []; // Silent fail for optional data sources
  }
}

// Promise.all for parallel operations
const [digests, modelCatalog, runtimeUsage] = await Promise.all([
  loadCachedUsageDigests(),
  loadCachedModelContextCatalog(),
  loadCachedRuntimeUsageData(),
]);

// Proper async wrapper for void function calls
void runMonitorSafely();
```

### Logging Conventions

```typescript
// Prefix all logs with [mission-control]
console.log("[mission-control] startup", { gateway: GATEWAY_URL });
console.error("[mission-control] monitor failed", error);

// Structured logging for commands
console.log("[mission-control] backup export", {
  exportedAt: bundle.exportedAt,
  fileName: written.fileName,
  sizeBytes: written.sizeBytes,
});
```

### Control Flow

```typescript
// Early returns
function normalizeCommand(input: string | undefined): CommandType | undefined {
  if (!input) return undefined;
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "") return undefined;
  // ...
}

// Guard clauses
function assertCommandOperationGate(command: CommandType): void {
  if (!LOCAL_TOKEN_AUTH_REQUIRED) return;
  if (LOCAL_API_TOKEN !== "") return;
  throw new Error("Command blocked by local token gate.");
}

// Nullish coalescing for defaults
const parsed = Number.parseInt(input ?? "", 10);
const value = (input ?? "").trim() || fallback;
```

### Testing Patterns

```typescript
import assert from "node:assert/strict";
import test from "node:test";

// Test with dynamic imports for isolation
test("usage-cost snapshot computes context percent", async () => {
  const { computeUsageCostSnapshot } = await import("../src/runtime/usage-cost");
  const snapshot = buildSnapshotFixture();
  const usage = computeUsageCostSnapshot(snapshot, [], []);

  assert.equal(usage.budget.status, "warn");
});

// Test fixtures
function buildSnapshotFixture(overrides?: {
  model?: string;
  tokensIn?: number;
}): ReadModelSnapshot {
  return {
    sessions: [{ sessionKey: "s-1", state: "running" }],
    // ...
  };
}

// Cleanup with try/finally
test("agent roster treats openclaw.json as source of truth", async () => {
  const home = await mkdtemp(join(tmpdir(), "test-"));
  const originalHome = process.env.OPENCLAW_HOME;
  try {
    // test code
  } finally {
    process.env.OPENCLAW_HOME = originalHome;
    await rm(home, { recursive: true });
  }
});
```

### File Organization

- One class/type per file preferred
- Runtime modules are typically 500-1500 lines
- Tests mirror source structure: `test/*.test.ts`
- Helper functions at bottom of file
- Interface and type definitions at top

### Safety Patterns

```typescript
// Readonly mode checks
if (READONLY_MODE) {
  throw new Error("Mutation not allowed in readonly mode");
}

// Operation gates
function assertCommandOperationGate(command: string): void {
  if (LOCAL_TOKEN_AUTH_REQUIRED && LOCAL_API_TOKEN === "") {
    throw new Error("Command blocked by local token gate.");
  }
}

// Dry-run defaults
export const APPROVAL_ACTIONS_DRY_RUN = process.env.APPROVAL_ACTIONS_DRY_RUN !== "false";
```

## Safety Constraints

- `READONLY_MODE=true` by default
- `LOCAL_TOKEN_AUTH_REQUIRED=true` by default
- `IMPORT_MUTATION_ENABLED=false` by default
- `APPROVAL_ACTIONS_ENABLED=false` by default
- `APPROVAL_ACTIONS_DRY_RUN=true` by default

Never modify these defaults without explicit user request.

## Environment Variables

See `.env.example` for all configuration options. Key variables:

- `GATEWAY_URL` - OpenClaw WebSocket endpoint
- `OPENCLAW_HOME` - OpenClaw home directory (~/.openclaw)
- `READONLY_MODE` - Enable/disable read-only mode
- `LOCAL_API_TOKEN` - Token for protected commands
- `UI_PORT` - UI server port (default: 4310)
