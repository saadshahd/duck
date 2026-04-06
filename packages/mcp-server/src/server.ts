import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";
import { z } from "zod";
import type { McpContext } from "./protocol.js";
import type {
  NotFound,
  StorageError,
  InvalidPageName,
  PatchError,
  QueryError,
} from "./errors.js";
import { dispatchQuery } from "./query/index.js";
import { dispatchManifest } from "./manifest.js";
import { applyPatches } from "./apply.js";

// ── Error union for all tool handlers ──────────────────────────────

type ToolError =
  | NotFound
  | StorageError
  | InvalidPageName
  | PatchError
  | QueryError;

// ── Effect → MCP boundary ──────────────────────────────────────────

const runTool = <T>(
  effect: Effect.Effect<T, ToolError>,
): Promise<CallToolResult> =>
  Effect.runPromise(
    effect.pipe(
      Effect.map((data) => ({
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      })),
      Effect.catchAll((err) =>
        Effect.succeed({
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: err._tag, ...err }),
            },
          ],
          isError: true,
        }),
      ),
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
        "Read page spec data: outline, element, subtree, type, search, selection, capture",
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
          .describe("Element ID (for element/subtree modes)"),
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
      description: "Apply RFC 6902 JSON patches to a page draft",
      inputSchema: {
        page: z.string().describe("Page name"),
        patches: z
          .array(
            z.object({
              op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
              path: z.string(),
              value: z.unknown().optional(),
              from: z.string().optional(),
            }),
          )
          .describe("RFC 6902 JSON Patch operations"),
      },
    },
    (args) => runTool(applyPatches(ctx, args)),
  );

  mcp.registerTool(
    "editor_commit",
    {
      description: "Promote draft to committed spec and push to browser",
      inputSchema: {
        page: z.string().describe("Page name"),
        label: z.string().optional().describe("History label for this commit"),
      },
    },
    (args) =>
      runTool(
        ctx.storage.commitDraft(args.page).pipe(
          Effect.flatMap(() => ctx.storage.readSpec(args.page)),
          Effect.tap((spec) =>
            Effect.sync(() => ctx.bridge.broadcast(args.page, spec)),
          ),
          Effect.map((spec) => ({
            committed: true,
            page: args.page,
            elementCount: Object.keys(spec.elements).length,
          })),
        ),
      ),
  );

  mcp.registerTool(
    "editor_discard",
    {
      description: "Delete draft for a page",
      inputSchema: {
        page: z.string().describe("Page name"),
      },
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
        "Query the component catalog: list components, get a single component schema, or get the full prompt",
      inputSchema: {
        what: z.enum(["components", "component", "prompt"]),
        componentType: z
          .string()
          .optional()
          .describe("Component name (required for component mode)"),
      },
      annotations: readOnly,
    },
    (args) => runTool(dispatchManifest(ctx.catalog, args)),
  );
}
