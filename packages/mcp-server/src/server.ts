import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { z } from "zod";
import type { McpContext } from "./protocol.js";
import type {
  NotFound,
  StorageError,
  InvalidPageName,
  QueryError,
} from "./errors.js";
import { preOrder } from "@json-render-editor/spec";
import type { Data } from "@puckeditor/core";
import { dispatchQuery } from "./query/index.js";
import { dispatchManifest } from "./manifest.js";
import { applyOps, type ProgressNotice } from "./apply.js";

// ── Error union for tool handlers ──────────────────────────────────

type ToolError = NotFound | StorageError | InvalidPageName | QueryError;

// ── Effect → MCP boundary ──────────────────────────────────────────

const json = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

type Notifier = {
  readonly sendNotification?: (n: {
    method: string;
    params: Record<string, unknown>;
  }) => Promise<void>;
  readonly _meta?: { progressToken?: string | number };
};

const makeNotifier = (extra: Notifier) => (n: ProgressNotice) => {
  const token = extra._meta?.progressToken;
  if (token === undefined || !extra.sendNotification) return;
  extra
    .sendNotification({
      method: "notifications/progress",
      params: {
        progressToken: token,
        progress: n.value,
        ...(n.total !== undefined ? { total: n.total } : {}),
        ...(n.message !== undefined ? { message: n.message } : {}),
      },
    })
    .catch(() => {});
};

const runTool = <T>(
  effect: Effect.Effect<T, ToolError>,
): Promise<CallToolResult> =>
  Effect.runPromise(
    effect.pipe(
      Effect.map(json),
      Effect.catchAll((err) => {
        const { _tag, ...fields } = err;
        return Effect.succeed({
          ...json({ error: _tag, ...fields, hint: err.hint }),
          isError: true,
        });
      }),
    ),
  );

// ── Server factory ─────────────────────────────────────────────────

export const createMcpServer = (ctx: McpContext) => {
  const mcp = new McpServer(
    { name: "json-render-editor", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  registerTools(mcp, ctx);
  return mcp;
};

// ── Tool registration ──────────────────────────────────────────────

const readOnly = { readOnlyHint: true, destructiveHint: false } as const;

const opSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    parentId: z.string().nullable(),
    slotKey: z.string().nullable(),
    index: z.number().optional(),
    component: z
      .object({
        type: z.string(),
        props: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough(),
  }),
  z.object({
    op: z.literal("update"),
    id: z.string(),
    props: z.record(z.string(), z.unknown()),
  }),
  z.object({ op: z.literal("remove"), id: z.string() }),
  z.object({
    op: z.literal("move"),
    id: z.string(),
    toParentId: z.string().nullable(),
    toSlotKey: z.string().nullable(),
    toIndex: z.number(),
  }),
]);

function registerTools(mcp: McpServer, ctx: McpContext) {
  mcp.registerTool(
    "editor_status",
    {
      description: "List pages, bridge status, and connection info",
      annotations: readOnly,
    },
    () =>
      runTool(
        Effect.gen(function* () {
          const pages = yield* ctx.storage.listPages();
          return {
            pages,
            bridge: { port: ctx.bridge.port, viewers: ctx.bridge.viewers() },
          };
        }),
      ),
  );

  mcp.registerTool(
    "editor_query",
    {
      description:
        "Read page data: outline, element, subtree, type, search, selection, capture",
      inputSchema: {
        page: z.string().optional().describe("Page name"),
        what: z.enum([
          "outline",
          "element",
          "subtree",
          "type",
          "search",
          "selection",
          "capture",
        ]),
        id: z
          .string()
          .optional()
          .describe("Component ID (for element/subtree modes)"),
        depth: z
          .number()
          .optional()
          .describe("Tree depth limit (for outline mode)"),
        componentType: z
          .string()
          .optional()
          .describe("Component type (for type mode)"),
        q: z.string().optional().describe("Search query (for search mode)"),
      },
      annotations: readOnly,
    },
    (args) => runTool(dispatchQuery(ctx, args)),
  );

  mcp.registerTool(
    "editor_apply",
    {
      description:
        "Edit a page using structural ops. Each op streams: designer sees the change land via the bridge; agent sees per-op progress via notifications/progress. " +
        "Op vocabulary: add (insert at parentId/slotKey/index), update (replace props), remove (delete by id), move (relocate by id).",
      inputSchema: {
        page: z.string().describe("Page name"),
        ops: z.array(opSchema).describe("Sequential structural ops"),
      },
    },
    (args, extra) =>
      runTool(
        applyOps(
          ctx,
          args as { page: string; ops: any },
          makeNotifier(extra as Notifier),
        ),
      ),
  );

  mcp.registerTool(
    "editor_commit",
    {
      description: "Promote draft to committed data and push to browser",
      inputSchema: {
        page: z.string().describe("Page name"),
        label: z.string().optional().describe("History label for this commit"),
      },
    },
    (args) =>
      runTool(
        ctx.storage.commitDraft(args.page).pipe(
          Effect.flatMap(() => ctx.storage.readSpec(args.page)),
          Effect.tap((data) =>
            Effect.sync(() => ctx.bridge.broadcast(args.page, data)),
          ),
          Effect.map((data) => ({
            committed: true,
            page: args.page,
            componentCount: countComponents(data),
          })),
        ),
      ),
  );

  mcp.registerTool(
    "editor_discard",
    {
      description: "Delete draft for a page",
      inputSchema: { page: z.string().describe("Page name") },
    },
    (args) =>
      runTool(
        ctx.storage
          .discardDraft(args.page)
          .pipe(Effect.map(() => ({ discarded: true, page: args.page }))),
      ),
  );

  mcp.registerTool(
    "editor_manifest",
    {
      description:
        "Query the component catalog. 'components' lists all with fields and defaults. " +
        "'component' returns one full schema. 'prompt' returns the LLM system prompt.",
      inputSchema: {
        what: z.enum(["components", "component", "prompt"]),
        componentType: z
          .string()
          .optional()
          .describe("Component name (required for component mode)"),
      },
      annotations: readOnly,
    },
    (args) => runTool(dispatchManifest(ctx.config, args)),
  );
}

const countComponents = (data: Data): number => {
  let n = 0;
  for (const _ of preOrder(data)) n++;
  return n;
};
