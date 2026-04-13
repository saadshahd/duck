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

const json = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data) }],
});

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
      description:
        "Edit a page spec. Creates the page automatically if it doesn't exist. " +
        "Each apply immediately pushes to the browser for live preview. " +
        "PREFERRED: Use 'spec' to merge a partial spec into the current page. " +
        "SPEC FORMAT: { root: string, elements: Record<string, UIElement> } — a FLAT map keyed by element ID. " +
        "Each UIElement: { type, props, children?: string[] } where children are IDs in the flat map. " +
        "Example spec: { root: 'page', elements: { page: { type: 'Box', props: {}, children: ['hero'] }, hero: { type: 'Heading', props: { text: 'Hello' } } } } " +
        "Build one section at a time — each response shows what's on the page so far.",
      inputSchema: {
        page: z.string().describe("Page name"),
        spec: z
          .object({})
          .passthrough()
          .optional()
          .describe(
            "Partial spec to deep-merge into the current page. Preferred over patches — just send the elements you want to add/update.",
          ),
        patches: z
          .array(
            z.object({
              op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
              path: z.string(),
              value: z.unknown().optional(),
              from: z.string().optional(),
            }),
          )
          .optional()
          .describe(
            "RFC 6902 JSON Patch array for fine-grained updates. Use the spec parameter instead when adding new elements.",
          ),
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
        "Query the component catalog. Call with 'components' to get all types with full schemas in one call. " +
        "Use 'component' for a single type's schema. Use 'prompt' for the full generation prompt.",
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
