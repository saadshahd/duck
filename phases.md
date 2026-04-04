# Editor Finalization → MCP Phases

Each phase has self-contained task prompts. Copy a prompt into a session to execute it.

**Order**: bugs → drag labels → context menu → type-to-edit → copy/paste → insert → multi-select → tests → MCP

---

## Phase 1: Bugs + Prop Editor

### Task 1a — Popover click-outside dismiss

**Files:**
- Modify: `packages/editor/src/editor/prop-editor/prop-popover.tsx`
- Create: `packages/editor/src/editor/prop-editor/use-on-click-outside.ts`

**Prompt:**
```
Fix: prop editor popover doesn't close when clicking outside.

## Context

`PropPopover` (prop-editor/prop-popover.tsx) renders a floating popover for editing element props. It handles Escape (lines 70-78 via keydown listener on document) but has no click-outside handler.

The popover lives inside Shadow DOM (OverlayRoot). Events from light DOM cross the shadow boundary — use `event.composedPath()` for containment checks, not `event.target`.

## What to build

1. Create `prop-editor/use-on-click-outside.ts` — a named hook:
   ```ts
   function useOnClickOutside(
     ref: React.RefObject<HTMLElement | null>,
     onClose: () => void,
   ): void
   ```
   - Listen for `pointerdown` on `document` (not `mousedown` — pointer events work across touch/mouse)
   - Check `event.composedPath().includes(ref.current)` — if NOT contained, call `onClose()`
   - Clean up on unmount

2. In `PropPopover`, replace nothing — add the hook call:
   ```ts
   useOnClickOutside(refs.floating, onClose);
   ```
   The floating ref is `refs.floating` from `useFloating()` — it's a `React.RefObject<HTMLElement>`.

## Why this approach
- `composedPath()` is the correct API for shadow DOM — `event.target` is retargeted at the shadow boundary
- Named hook per TASTE.md: raw useEffect for click-outside is an unnamed concept
- `pointerdown` fires before `click`, preventing the popover from closing and reopening when clicking its own trigger

## Risks
- The popover contains inputs, selects, textareas — clicks inside those must NOT trigger close. `composedPath().includes(ref)` handles this since those elements are descendants of the floating ref
- If the popover trigger button is outside the popover, clicking it will fire close AND reopen — verify this doesn't cause flicker

## Verify
- Click inside popover fields → popover stays open
- Click on the rendered page outside popover → popover closes
- Click on another overlay element → popover closes
- Press Escape → popover still closes (existing behavior preserved)
- `bun test` passes, `bunx playwright test --project=chromium` passes
```

---

### Task 1b — Fix unset prop editing

**Files:**
- Modify: `packages/editor/src/editor/spec-ops/edit-prop.ts`
- Modify: `packages/editor/src/editor/spec-ops/edit-prop.test.ts`
- Check: `packages/editor/src/editor/spec-ops/helpers.ts` (SpecOpsError union)

**Prompt:**
```
Fix: setting a value on a prop that doesn't exist yet in element.props does nothing.

## Context

`editProp` (spec-ops/edit-prop.ts) has a `checkProp` guard (lines 5-12) that returns `err({ tag: "prop-not-found" })` when the propKey is not in `element.props`. This means the popover's `onPropChange` silently fails for props that have a schema field but no current value.

The prop popover renders ALL fields from the Zod schema (via `ZodFields` in zod-fields.tsx:157-179), including optional props with no value yet. When the user types into one of these empty fields, `editProp` returns an error because `propKey in el.props` is false.

## What to build

1. In `edit-prop.ts`: remove the `checkProp` function entirely. The only validation needed is that the element exists (`getElement` already does this). Whether a prop is valid for a component is the catalog's concern — the editor is catalog-agnostic.

   Simplified function:
   ```ts
   export function editProp(
     spec: Spec,
     elementId: string,
     propKey: string,
     newValue: unknown,
   ): Result<Spec, SpecOpsError> {
     return getElement(spec, elementId).map(() =>
       cloneAndMutate(spec, (draft) => {
         draft.elements[elementId].props[propKey] = newValue;
       }),
     );
   }
   ```

2. In `helpers.ts`: check if `"prop-not-found"` is part of the `SpecOpsError` union. If it is and no other function produces it, remove it from the union.

3. In `edit-prop.test.ts`:
   - Add test: "creates prop when key does not exist" — call editProp with a propKey not in element.props, assert Result is ok and new spec has the value
   - Update or remove any test asserting `prop-not-found` error
   - Search the codebase for any code matching on `"prop-not-found"` — update or remove

## Risks
- Removing checkProp changes the error surface. Grep for `"prop-not-found"` across the codebase before implementing
- This deliberately allows setting arbitrary props — the editor doesn't validate prop names against the schema. That's by design (catalog-agnostic)

## Verify
- Open popover on an element → change a prop that has no current value → value is set in the spec
- Existing prop editing still works
- `bun test packages/editor/src/editor/spec-ops/edit-prop.test.ts` passes
- `bun test` passes (no other tests broke)
```

---

### Task 1c — Demo catalog style typing

**Files:**
- Modify: `packages/editor/src/demo/catalog.ts`

**Prompt:**
```
Update demo catalog to type style props as z.object instead of z.record.

## Context

All 8 demo components type `style` as `z.record(z.unknown()).optional()` (catalog.ts). This hits the `FallbackField` JSON textarea in the prop editor. If `style` is typed as `z.object({...})`, the editor automatically renders individual labeled fields via `ObjectFields` → recursive `ZodField`.

The sample-document.json has specific style properties per component — use those as the schema keys.

## What to build

Replace `style: z.record(z.unknown()).optional()` with `z.object({...}).optional()` for each component. Include the style properties actually used in `demo/sample-document.json` plus a few common extras:

- **Box**: maxWidth, margin, padding, fontFamily, color, background, borderRadius
- **Heading**: fontSize, marginBottom, textAlign, color
- **Text**: fontSize, color, maxWidth, marginBottom, lineHeight
- **Button**: (no style in sample — keep it minimal or omit)
- **Image**: width, maxWidth, borderRadius, objectFit
- **Stack**: margin, gap (gap is already a direct prop — check if style.gap is used)
- **Card**: padding, background, borderRadius, border
- **Grid**: gap (already a direct prop — check overlap)

All style fields: `z.string().optional()`. CSS values are always strings.

## Risks
- If sample-document.json has style properties not in the schema, z.object will fail strict parsing. But the editor doesn't parse props against schemas — it only uses schemas for field rendering. So extra properties in the data are fine
- Some components may use style properties not listed here — that's acceptable, the user can still use the JSON fallback for unlisted properties via a "style (raw)" escape hatch, but don't build that now

## Verify
- `bun run dev` → open popover on any element → style shows individual fields, not a JSON textarea
- Editing a style field (e.g., fontSize on a Heading) → value updates in the rendered page
- `bun run typecheck` passes
```

---

## Phase 2: Drag Drop Zone Labels

### Task 2a — Parent container label during drag

**Files:**
- Create: `packages/editor/src/editor/drag/drop-zone-label.tsx`
- Modify: `packages/editor/src/editor/drag/drag.css`
- Modify: `packages/editor/src/editor/shell.tsx`

**Prompt:**
```
Show the receiving container's type label during drag-and-drop.

## Context

During drag, `useDragReorder` (drag/use-drag-reorder.ts) returns `dropTarget: DropTarget | null`. The `DropTarget` type (drop-indicator.tsx:7-9):
```ts
type DropTarget =
  | { kind: "line"; elementId: string; edge: Edge; axis: Axis }
  | { kind: "container"; elementId: string };
```

When `kind === "container"`, the user is dropping INTO a container — `elementId` IS the container. When `kind === "line"`, they're dropping between siblings — the receiving container is the parent of `elementId` (use `findParent` from spec-ops/reorder.ts).

The `SelectionLabel` (selection/selection-label.tsx) already renders a floating type label using @floating-ui/react. Reuse that positioning pattern.

## What to build

1. `drag/drop-zone-label.tsx` — new component:
   ```ts
   type DropZoneLabelProps = {
     registry: FiberRegistry;
     spec: Spec;
     target: DropTarget;
   };
   ```
   - Derive container ID: if `target.kind === "container"` → `target.elementId`. If `target.kind === "line"` → call `findParent(spec, target.elementId)` to get `parentId`
   - Look up container type: `spec.elements[containerId]?.type`
   - Position at top-start of the container element using `useFloating({ placement: "top-start" })` with `offset(4)` and `autoUpdate` (same pattern as SelectionLabel)
   - Use `useShadowSheet(css)` for shadow DOM styling
   - `pointer-events: none` — must not interfere with drop hit testing

2. Style in `drag/drag.css`:
   - Distinct from selection label — use a dashed border or a different background token so it's clear this is a drop target hint, not the selection
   - Small font, subtle, doesn't compete with the drop indicator line

3. Wire in `shell.tsx`:
   - Render `<DropZoneLabel>` inside `OverlayRoot` when `dropTarget` is non-null AND machine is in drag state (`state.context.dragSourceId !== null`)
   - Pass `registry`, `spec`, `target`

## Risks
- `findParent` does a linear scan of spec.elements — acceptable during drag (fires on monitor change, not every frame)
- If the container is the root element, the label still shows (e.g., "Box") — that's correct
- The label must disappear instantly on drop or drag cancel — driven by `dropTarget` becoming null

## Verify
- Drag an element → drop zone label appears on the receiving container showing its type (e.g., "Stack")
- Cross-parent drag → label changes as you move between containers
- Drop or cancel → label disappears immediately
- Label doesn't interfere with drop target detection (pointer-events: none)
- `bunx playwright test --project=chromium` — existing drag e2e tests still pass
```

---

## Phase 3: Context Menu

### Task 3a — Right-click element picker

**Files:**
- Create: `packages/editor/src/editor/context-menu/use-context-menu.ts`
- Create: `packages/editor/src/editor/context-menu/context-menu.tsx`
- Create: `packages/editor/src/editor/context-menu/context-menu.css`
- Create: `packages/editor/src/editor/context-menu/index.ts`
- Modify: `packages/editor/src/editor/shell.tsx`

**Prompt:**
```
Add a right-click context menu that shows all spec elements at the click point.

## Context

This is a new domain: `src/editor/context-menu/`. It follows the module layer rules: domain layer, imports from infrastructure (fiber, overlay, spec-ops) but not from other domains.

The fiber registry (fiber/index.ts) provides `getNodeId(element): string | undefined` to map DOM elements back to spec IDs. `document.elementsFromPoint(x, y)` returns all DOM elements at a point in paint-order (topmost first).

This becomes the editor's general-purpose context menu — future phases will add Copy, Paste, Delete, Insert entries here.

## What to build

1. `use-context-menu.ts` — hook managing menu state:
   ```ts
   type MenuState =
     | { open: false }
     | { open: true; x: number; y: number; elementIds: string[] };

   function useContextMenu(deps: {
     registry: FiberRegistry | null;
     send: (event: EditorEvent) => void;
   }): { menu: MenuState; close: () => void }
   ```
   - Register `contextmenu` listener on `document`
   - On right-click:
     - `e.preventDefault()` to suppress browser default menu
     - `document.elementsFromPoint(e.clientX, e.clientY)` → get all DOM elements at point
     - Filter through `registry.getNodeId(el)` → keep only spec elements
     - Deduplicate IDs (same spec element may have multiple DOM nodes)
     - Store `{ open: true, x: e.clientX, y: e.clientY, elementIds }`
   - If no spec elements at point → don't open (let browser default menu through)
   - `close()` → set to `{ open: false }`

2. `context-menu.tsx` — renders the floating menu:
   ```ts
   type ContextMenuProps = {
     x: number;
     y: number;
     elementIds: string[];
     spec: Spec;
     send: (event: EditorEvent) => void;
     onClose: () => void;
   };
   ```
   - Position: `position: fixed; left: x; top: y` (cursor position, no floating-ui needed)
   - Each item shows: component type + element ID (e.g., "Card · feature-1")
   - `onMouseEnter` per item → `send({ type: "HOVER", elementId })` to highlight
   - `onMouseLeave` → `send({ type: "UNHOVER" })`
   - `onClick` per item → `send({ type: "SELECT", elementId })`, then `onClose()`
   - Escape → `onClose()`
   - Click-outside → `onClose()` (reuse `useOnClickOutside` from Phase 1a)
   - `pointer-events: auto` on the menu container (overlay root has `pointer-events: none`)
   - Use `useShadowSheet(css)` for shadow DOM styling

3. `context-menu.css`:
   - Dark floating panel matching existing overlay aesthetic
   - Use tokens from `overlay/tokens.css` (--editor-surface, --editor-text, etc.)
   - Hover state on items (subtle highlight)
   - Max-height with scroll for many elements

4. `index.ts` — barrel: export useContextMenu, ContextMenu

5. Wire in `shell.tsx`:
   - Call `useContextMenu({ registry, send })`
   - Render `<ContextMenu>` inside `OverlayRoot` when `menu.open === true`
   - Pass `spec`, `send`, `onClose: menu.close`

## Risks
- `document.elementsFromPoint` returns overlay elements too (the shadow host div). Filter: only keep elements where `getNodeId` returns a defined value
- The context menu itself must not be included in `elementsFromPoint` results — it renders in shadow DOM overlay so it won't be
- Right-click on an area with no spec elements (e.g., browser chrome, empty space) → don't prevent default, let the browser menu show
- Multiple DOM elements may map to the same spec ID (e.g., a component renders multiple DOM nodes) → deduplicate by spec ID, preserve first-seen order

## Verify
- Right-click on an element → menu appears with type + ID
- Right-click on overlapping area → multiple elements listed in z-order
- Hover menu item → element highlights on page
- Click menu item → element selected, menu closes
- Click outside → menu closes
- Escape → menu closes
- Right-click on empty area (no spec elements) → browser default menu shows
- `bun run typecheck` passes
```

---

## Phase 4: Type-to-Edit

### Task 4a — Printable keypress enters inline edit

**Files:**
- Modify: `packages/editor/src/editor/keyboard/use-keyboard.ts`
- Modify: `packages/editor/src/editor/shell.tsx`

**Prompt:**
```
When a text element is selected and the user types a printable character, enter inline edit mode.

## Context

Inline edit is currently triggered by double-click only. The flow:
1. `useDoubleClickEdit` detects double-click → calls `findEditableProp(spec, elementId, getPropSchema)` → sends `DOUBLE_CLICK_TEXT` event
2. Machine transitions to editing.inline state
3. `useInlineEdit` makes the DOM element contentEditable

`findEditableProp` (prop-editor/find-editable-prop.ts) returns `{ propKey, original }` if the element has an editable text prop, or undefined.

`useKeyboard` (keyboard/use-keyboard.ts) registers shortcuts via `tinykeys(window, bindings)`. It takes `{ machine: Send, history: Send, nav: NavContext }`.

Machine events relevant:
```ts
{ type: "DOUBLE_CLICK_TEXT"; elementId: string; propKey: string; original: string }
```

## What to build

1. In `shell.tsx`, create a `startEdit` callback:
   ```ts
   const startEdit = useCallback((initialChar: string) => {
     const selectedId = state.context.selectedId;
     if (!selectedId) return;
     const editable = findEditableProp(currentSpec, selectedId, getPropSchema);
     if (!editable) return;
     send({
       type: "DOUBLE_CLICK_TEXT",
       elementId: selectedId,
       propKey: editable.propKey,
       original: initialChar, // replaces existing text with typed char
     });
   }, [state.context.selectedId, currentSpec, getPropSchema, send]);
   ```

2. In `use-keyboard.ts`, add a printable key listener alongside tinykeys:
   - Add a `keydown` listener on `window` (separate from tinykeys — tinykeys is for named shortcuts, this is a catch-all)
   - Guards (ALL must pass):
     - `event.key.length === 1` (single printable character)
     - `!event.isComposing` (not in IME composition)
     - `!event.metaKey && !event.ctrlKey && !event.altKey` (not a shortcut)
     - No active input focused: `!["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "")` and `document.activeElement?.contentEditable !== "true"`
   - If guards pass: `event.preventDefault()`, call `startEdit(event.key)`

   Expand the hook signature:
   ```ts
   function useKeyboard(targets: {
     machine: Send;
     history: Send;
     nav: NavContext;
     startEdit?: (initialChar: string) => void;
   }): void
   ```

3. Wire in `shell.tsx`: pass `startEdit` to `useKeyboard`

## Risks
- International keyboards: some characters require IME composition. `e.isComposing` check prevents entering edit mode during composition
- The initial character REPLACES existing text. This matches Figma/Sketch behavior — typing on a selected text starts fresh. The original value is `initialChar`, not the element's current text
- If `findEditableProp` returns undefined (element has no editable text), the keypress is ignored — no error, no feedback
- The `DOUBLE_CLICK_TEXT` event name is now misleading (also triggered by keyboard). Consider renaming to `START_INLINE_EDIT` atomically across the codebase. But this is optional polish — the behavior is correct either way

## Verify
- Select a Heading → press "H" → enters inline edit mode with "H" as the text
- Select a Button (no editable text prop) → press "H" → nothing happens
- While typing in the popover input → keypresses don't trigger edit mode
- Cmd+C while selected → doesn't trigger edit mode (modifier guard)
- `bun test` passes
```

---

## Phase 5: Copy/Paste

### Task 5a — Clipboard spec operations

**Files:**
- Create: `packages/editor/src/editor/spec-ops/clipboard.ts`
- Create: `packages/editor/src/editor/spec-ops/clipboard.test.ts`

**Prompt:**
```
Add copy/paste spec operations: serialize fragment, deserialize with new IDs, insert, duplicate.

## Context

Spec structure (`@json-render/core`):
```ts
type Spec = { root: string; elements: Record<string, UIElement> };
type UIElement = { type: string; props: Record<string, unknown>; children?: string[] };
```

Existing helpers in `spec-ops/helpers.ts`:
- `collectDescendants(spec, ancestorId)` → `ReadonlySet<string>` of all descendant IDs
- `cloneAndMutate(spec, mutate)` → immutable spec update via structuredClone + mutation
- `getElement(spec, elementId)` → `Result<UIElement, SpecOpsError>`
- `nearestSibling(spec, parentId, childId)` → next/prev sibling ID

From `spec-ops/reorder.ts`:
- `findParent(spec, childId)` → `Result<{ parentId, childIndex }, SpecOpsError>`

No existing ID generation utility — build one inline.

## What to build

New file: `spec-ops/clipboard.ts`

1. Fragment type:
   ```ts
   type SpecFragment = {
     _type: "json-render-fragment";
     root: string;
     elements: Record<string, UIElement>;
   };
   ```
   The `_type` marker enables clipboard validation on paste.

2. `serializeFragment(spec, elementId)` → `Result<SpecFragment, SpecOpsError>`:
   - Validate element exists via `getElement`
   - Collect element + descendants via `collectDescendants`
   - Build fragment: `root = elementId`, elements = subset of spec.elements containing only the target + descendants
   - Return the fragment

3. `deserializeFragment(fragment, existingIds: Set<string>)` → `SpecFragment`:
   - Generate new ID for each element in the fragment
   - ID format: `${element.type.toLowerCase()}-${n}` where n increments until not in `existingIds` and not already assigned in this operation
   - Build an old→new ID map
   - Remap: update all `children` arrays to use new IDs, update `root` to new root ID
   - Pure function, can't fail

4. `insertFragment(spec, fragment, afterElementId)` → `Result<Spec, SpecOpsError>`:
   - Find parent of `afterElementId` via `findParent`
   - `cloneAndMutate`: merge `fragment.elements` into `spec.elements`, splice `fragment.root` into parent's children after `afterElementId`
   - Return new spec

5. `duplicateElement(spec, elementId)` → `Result<Spec, SpecOpsError>`:
   - Compose: `serializeFragment` → `deserializeFragment` (with all existing spec IDs) → `insertFragment(spec, newFragment, elementId)`
   - Guard: cannot duplicate root (`elementId === spec.root` → error)

## Test file: `clipboard.test.ts`

Factory helper:
```ts
const twoLevelSpec = (): Spec => ({
  root: "page",
  elements: {
    page: { type: "Box", props: {}, children: ["a", "b"] },
    a: { type: "Card", props: { title: "A" }, children: ["a1"] },
    a1: { type: "Text", props: { text: "Hello" } },
    b: { type: "Card", props: { title: "B" } },
  },
});
```

Tests:
- serializeFragment("a") → fragment has a, a1, root is "a"
- serializeFragment("nonexistent") → error
- deserializeFragment: all IDs changed, no collisions, children arrays remapped
- deserializeFragment with conflicting existingIds: IDs skip conflicts
- insertFragment after "a" → new element between a and b in parent's children
- duplicateElement("a") → spec has original a + new card with new ID, children intact
- duplicateElement root → error
- duplicateElement leaf ("b") → single element fragment
- Immutability: original spec unchanged after all operations

## Risks
- ID generation must check against ALL existing IDs (both spec.elements keys and IDs being generated in this batch)
- Children arrays in the fragment reference OLD IDs — remapping must be complete before inserting
- `structuredClone` in `cloneAndMutate` handles deep copy — no manual cloning needed

## Verify
- `bun test packages/editor/src/editor/spec-ops/clipboard.test.ts` passes
- All tests use real Spec objects, no mocks
```

---

### Task 5b — Wire keyboard shortcuts + context menu entries

**Files:**
- Modify: `packages/editor/src/editor/keyboard/use-keyboard.ts`
- Modify: `packages/editor/src/editor/shell.tsx`
- Modify: `packages/editor/src/editor/context-menu/context-menu.tsx`

**Prompt:**
```
Wire copy/paste/cut/duplicate to keyboard shortcuts and context menu.

## Context

Clipboard operations from Task 5a:
- `serializeFragment(spec, elementId)` → `Result<SpecFragment, SpecOpsError>`
- `deserializeFragment(fragment, existingIds)` → `SpecFragment`
- `insertFragment(spec, fragment, afterElementId)` → `Result<Spec, SpecOpsError>`
- `duplicateElement(spec, elementId)` → `Result<Spec, SpecOpsError>`

`deleteElement` (spec-ops/delete.ts) already exists.
`SpecPush` (types.ts): `(spec: Spec, label: string, group?: string) => void`

## What to build

1. In `shell.tsx`, create clipboard callbacks:

   ```ts
   const handleCopy = useCallback(async () => {
     const id = state.context.selectedId;
     if (!id) return;
     serializeFragment(currentSpec, id).map(async (fragment) => {
       await navigator.clipboard.writeText(JSON.stringify(fragment));
     });
   }, [state.context.selectedId, currentSpec]);

   const handlePaste = useCallback(async () => {
     const id = state.context.selectedId;
     if (!id) return;
     try {
       const text = await navigator.clipboard.readText();
       const parsed = JSON.parse(text);
       if (parsed?._type !== "json-render-fragment") return;
       const allIds = new Set(Object.keys(currentSpec.elements));
       const remapped = deserializeFragment(parsed, allIds);
       insertFragment(currentSpec, remapped, id).map((next) =>
         push(next, `Pasted ${remapped.elements[remapped.root]?.type ?? "element"}`)
       );
     } catch { /* invalid clipboard content — ignore */ }
   }, [state.context.selectedId, currentSpec, push]);

   const handleCut = useCallback(async () => {
     await handleCopy();
     const id = state.context.selectedId;
     if (!id) return;
     deleteElement(currentSpec, id).map(({ spec, parentId }) => {
       push(spec, "Cut element");
       send({ type: "SELECT", elementId: nearestSibling(currentSpec, parentId, id) });
     });
   }, [handleCopy, state.context.selectedId, currentSpec, push, send]);

   const handleDuplicate = useCallback(() => {
     const id = state.context.selectedId;
     if (!id) return;
     duplicateElement(currentSpec, id).map((next) => {
       push(next, "Duplicated element");
     });
   }, [state.context.selectedId, currentSpec, push]);
   ```

2. In `use-keyboard.ts`, register via tinykeys:
   ```ts
   "$mod+c": (e) => { e.preventDefault(); onCopy?.(); },
   "$mod+v": (e) => { e.preventDefault(); onPaste?.(); },
   "$mod+x": (e) => { e.preventDefault(); onCut?.(); },
   "$mod+d": (e) => { e.preventDefault(); onDuplicate?.(); },
   ```

   Expand hook signature with optional clipboard callbacks.
   Guard: all require selectedId (except paste which also needs clipboard content — handled in the callback).

3. In `context-menu.tsx`, add a divider + entries after the element list:
   - Copy, Cut, Paste, Duplicate
   - Each calls the same callbacks passed from shell
   - All disabled when no element is selected (except paste which checks clipboard)

## Risks
- `navigator.clipboard.readText()` is async and may prompt for permission. Handle denial as no-op
- Paste validation: clipboard may have non-JSON or non-fragment JSON. The `_type` check + try/catch handles this
- `$mod+c` may conflict with browser's native copy. `e.preventDefault()` suppresses it — only do this when a spec element is selected. If nothing selected, let the browser handle it
- Cross-tab paste: works naturally since clipboard contains JSON. Different catalog = user's problem

## Verify
- Select element → Cmd+C → Cmd+V → element duplicated as next sibling with new IDs
- Cmd+X → element removed, clipboard has fragment
- Cmd+D → element duplicated (no clipboard interaction)
- Right-click → context menu shows Copy/Cut/Paste/Duplicate
- Paste with non-fragment clipboard content → nothing happens
- `bun test` passes
```

---

## Phase 6: Insert Element

### Task 6a — Insert spec operation

**Files:**
- Create: `packages/editor/src/editor/spec-ops/insert.ts`
- Create: `packages/editor/src/editor/spec-ops/insert.test.ts`

**Prompt:**
```
Add insertElement spec operation for adding new elements from the catalog.

## Context

Same infrastructure as clipboard operations. Uses `findParent`, `cloneAndMutate`, `getElement` from spec-ops/helpers and reorder.

## What to build

New file: `spec-ops/insert.ts`

```ts
type InsertPosition = { tag: "child" } | { tag: "after" };

function insertElement(
  spec: Spec,
  componentType: string,
  targetId: string,
  position: InsertPosition,
  defaultProps?: Record<string, unknown>,
): Result<{ spec: Spec; newElementId: string }, SpecOpsError>
```

Behavior:
- Generate unique ID: `${componentType.toLowerCase()}-${n}` where n starts at 1 and increments until not in `spec.elements`
- Create UIElement: `{ type: componentType, props: defaultProps ?? {} }`
- If `position.tag === "child"`:
  - Validate target has a `children` array (containers). If not → error `{ tag: "not-a-container", elementId: targetId }`
  - Add `children: []` to the new element (it's going into a container, so it might be a container itself — but default to no children)
  - Append new ID to target's children
- If `position.tag === "after"`:
  - `findParent(spec, targetId)` to get parent + index
  - Splice new ID after targetId in parent's children
- Use `cloneAndMutate`
- Return new spec + generated ID

Add `"not-a-container"` to `SpecOpsError` union in helpers.ts if not present.

## Test file: `insert.test.ts`

Tests:
- Insert as child → element added, last in children array
- Insert after → element at correct position in parent's children
- Insert after last child → element at end
- ID generation: if "text-1" exists, generates "text-2"
- Default props applied
- Empty props when no defaults
- Insert as child of leaf (no children array) → error
- Immutability: original spec unchanged

## Verify
- `bun test packages/editor/src/editor/spec-ops/insert.test.ts` passes
```

---

### Task 6b — Catalog picker + toolbar integration

**Files:**
- Create: `packages/editor/src/editor/insert/catalog-picker.tsx`
- Create: `packages/editor/src/editor/insert/use-insert.ts`
- Create: `packages/editor/src/editor/insert/insert.css`
- Create: `packages/editor/src/editor/insert/index.ts`
- Modify: `packages/editor/src/editor/selection/action-bar.tsx` (add '+' button)
- Modify: `packages/editor/src/editor/keyboard/use-keyboard.ts` (add '/' shortcut)
- Modify: `packages/editor/src/editor/machine/editor-machine.ts` (add insert state)
- Modify: `packages/editor/src/editor/shell.tsx`

**Prompt:**
```
Add element insertion: catalog picker opened by toolbar '+' button or '/' keyboard shortcut.

## Context

New domain: `src/editor/insert/`. Follows layer rules — imports from infrastructure only.

EditorAction union (selection/action-bar.tsx:15-20) currently has: move-up, move-down, delete, edit, more.

Machine context (machine/editor-machine.ts:19-24) currently has: hoveredId, selectedId, editing, dragSourceId.

## What to build

1. **Machine** (editor-machine.ts):
   - Add to context: `insertOpen: boolean` (default: false)
   - Add events: `{ type: "OPEN_INSERT" }`, `{ type: "CLOSE_INSERT" }`
   - In selected state: OPEN_INSERT → assign insertOpen: true. CLOSE_INSERT → assign insertOpen: false
   - DESELECT, ESCAPE → also set insertOpen: false

2. **Action bar** (selection/action-bar.tsx):
   - Add `{ tag: "insert" }` to EditorAction union
   - Add '+' button before the existing move buttons:
     ```tsx
     <button type="button" onClick={() => onAction({ tag: "insert" })}>+</button>
     ```

3. **Catalog picker** (insert/catalog-picker.tsx):
   ```ts
   type CatalogPickerProps = {
     registry: FiberRegistry;
     elementId: string;
     componentTypes: string[];
     onInsert: (componentType: string) => void;
     onClose: () => void;
   };
   ```
   - Floating panel anchored to selected element via @floating-ui/react (same pattern as PropPopover)
   - Filter input at top: simple case-insensitive `includes` match on type name
   - List of matching types — click one → `onInsert(type)`
   - Escape or click-outside → `onClose()`
   - Auto-focus the filter input on mount
   - `useShadowSheet(css)` for styling

4. **Insert hook** (insert/use-insert.ts):
   ```ts
   function useInsert(deps: {
     spec: Spec;
     selectedId: string | null;
     send: (event: EditorEvent) => void;
     push: SpecPush;
   }): { onInsert: (componentType: string) => void }
   ```
   - `onInsert`: determine position — if selected element has children, insert as child; else insert after
   - Call `insertElement` spec-op with `componentType`, target, position, empty props
   - Push to history: "Added {componentType}"
   - Select the new element: `send({ type: "SELECT", elementId: newId })`
   - Close picker: `send({ type: "CLOSE_INSERT" })`

5. **Keyboard** (use-keyboard.ts):
   - Add `/` binding (when selected, not in input): `send({ type: "OPEN_INSERT" })`

6. **Shell** (shell.tsx):
   - Handle `{ tag: "insert" }` action → `send({ type: "OPEN_INSERT" })`
   - Call `useInsert` hook
   - Render `<CatalogPicker>` when `state.context.insertOpen` is true
   - Pass `componentTypes` — derive from the registry. The shell has access to `registry: ComponentRegistry` from props. Get type names: the `EditorShell` already receives it as a prop, extract the type name list
   - Pass `onInsert` from the hook, `onClose` that sends CLOSE_INSERT

## Risks
- The editor must NOT import ComponentRegistry internals. Component type names should be passed as `string[]` from the demo/consumer layer
- `EditorShellProps` may need a new optional prop: `componentTypes?: string[]` for the picker. If not provided, the '+' button doesn't render
- The '/' shortcut must check `document.activeElement` isn't an input (same guard as type-to-edit)
- Auto-focusing the filter input: must work inside shadow DOM. Use `ref.current?.focus()` in a useEffect

## Verify
- Select element → click '+' in toolbar → picker appears with component types
- Type to filter → list narrows
- Click a type → new element inserted, selected
- Press '/' → picker opens
- Escape → picker closes
- Insert into container → added as last child
- Insert on leaf → added as next sibling
- `bun run typecheck` passes, `bun test` passes
```

---

## Phase 7: Multi-Select

### Task 7a — Machine state change

**Files:**
- Modify: `packages/editor/src/editor/machine/editor-machine.ts`
- Modify: `packages/editor/src/editor/machine/editor-machine.test.ts`

**Prompt:**
```
Extend the editor machine to support multi-select via shift-click.

## Context

Current EditorContext (editor-machine.ts:19-24):
```ts
type EditorContext = {
  hoveredId: string | null;
  selectedId: string | null;
  editing: Editing | null;
  dragSourceId: string | null;
};
```

Current EditorEvent SELECT: `{ type: "SELECT"; elementId: string }`

## What to build

1. Change context:
   ```ts
   type EditorContext = {
     hoveredId: string | null;
     selectedIds: ReadonlySet<string>;    // was selectedId
     lastSelectedId: string | null;       // new — anchor for action bar
     editing: Editing | null;
     dragSourceId: string | null;
     insertOpen: boolean;                 // from Phase 6 if already added
   };
   ```
   Initial: `selectedIds: new Set(), lastSelectedId: null`

2. Add event: `{ type: "SHIFT_SELECT"; elementId: string }`

3. Event behaviors:
   - `SELECT`: `selectedIds = new Set([elementId])`, `lastSelectedId = elementId`
   - `SHIFT_SELECT`: toggle elementId in set. If added → `lastSelectedId = elementId`. If removed and set empty → transition to idle, `lastSelectedId = null`. If removed and set non-empty → `lastSelectedId = last remaining or unchanged`
   - `DESELECT` / `ESCAPE`: `selectedIds = new Set()`, `lastSelectedId = null`
   - `DRAG_START`: unchanged — uses `sourceId` param, drag is single-element

4. Guard updates:
   - "has selection": `selectedIds.size > 0`
   - Transition idle → selected: on SELECT or SHIFT_SELECT when set becomes non-empty
   - Transition selected → idle: on DESELECT, ESCAPE, or SHIFT_SELECT that empties the set

5. BREAKING CHANGE: every reference to `selectedId` across the codebase must update. Before implementing, search for all usages:
   - `state.context.selectedId` → `state.context.lastSelectedId` (for single-element operations) or `state.context.selectedIds` (for set operations)
   - This affects: shell.tsx, use-selection.ts, use-keyboard.ts, use-drag-reorder.ts, use-prop-editor.tsx, action-bar.tsx, selection-label.tsx, selection-ring.tsx, use-action-handler, box-model hooks, ghost hooks

   Do this as an ATOMIC change — update all references in one commit.

## Tests (editor-machine.test.ts):
- SELECT → selectedIds has one element
- SELECT different → set replaced with new element
- SHIFT_SELECT → element added to set
- SHIFT_SELECT same → element removed from set
- SHIFT_SELECT last element → transitions to idle
- DESELECT → set empty
- All existing tests updated for new context shape

## Risks
- XState v5 context comparisons use reference equality. Every context update must create a NEW Set, not mutate. Use `new Set([...existing, newId])` and `new Set([...existing].filter(id => id !== removeId))`
- The model-based test's state space expands with multi-select. May need to bound the model (max 2 selected) to keep path enumeration tractable
- This is the largest refactor in the roadmap. Do it carefully — run typecheck after every file change

## Verify
- `bun run typecheck` passes with zero errors
- `bun test packages/editor/src/editor/machine/editor-machine.test.ts` passes
- `bun test` — all tests pass
- `bunx playwright test --project=chromium` — all e2e tests pass
```

---

### Task 7b — Selection rendering + bulk operations

**Files:**
- Modify: `packages/editor/src/editor/selection/selection-ring.tsx`
- Modify: `packages/editor/src/editor/selection/selection-label.tsx`
- Modify: `packages/editor/src/editor/selection/action-bar.tsx`
- Modify: `packages/editor/src/editor/selection/use-selection.ts`
- Modify: `packages/editor/src/editor/shell.tsx`

**Prompt:**
```
Update selection UI for multi-select: multiple rings, bulk delete, bulk move.

## Context

After Task 7a, context has `selectedIds: ReadonlySet<string>` and `lastSelectedId: string | null`.

## What to build

1. **use-selection.ts** — detect shift key:
   - In the click handler, check `e.shiftKey`
   - If shift: `send({ type: "SHIFT_SELECT", elementId })`
   - If not: `send({ type: "SELECT", elementId })` (existing behavior)

2. **selection-ring.tsx** — render multiple rings:
   - Currently renders one ring. Change to map over `selectedIds`:
   ```tsx
   {Array.from(selectedIds).map(id => (
     <SingleRing key={id} registry={registry} elementId={id} />
   ))}
   ```
   - Extract existing ring rendering into a `SingleRing` component

3. **selection-label.tsx** — show count badge:
   - Render label for `lastSelectedId` only
   - When `selectedIds.size > 1`, append count: `{elementType} (+{selectedIds.size - 1})`

4. **action-bar.tsx** — multi-select aware actions:
   - Anchor to `lastSelectedId`
   - Move up/down: disabled unless ALL selected share the same parent (check via `findParent` for each)
   - Delete: enabled when set non-empty. Deletes all selected
   - Edit/Insert/More: disabled when `selectedIds.size > 1`

5. **shell.tsx** — bulk operation callbacks:
   - Bulk delete: collect all selectedIds, delete in a single `cloneAndMutate` (not one-by-one). Remove all elements + their descendants. Update all parent children arrays. Push single history entry "Deleted {n} elements". After delete, select nearest sibling of last deleted.
   - Bulk move: only when all selected are siblings. Shift them all in the same direction within the parent's children array. Single history entry.

## Risks
- Bulk delete in one `cloneAndMutate`: must handle case where selected elements are nested (parent selected AND child selected). Deleting parent already removes child — don't double-delete. Filter: only delete elements whose parent is NOT also in the selected set
- Rendering N selection rings: N × getBoundingClientRect per frame. Fine for N < 20. Don't optimize prematurely
- Action bar anchor to `lastSelectedId`: if that element is deleted by another action, bar disappears — correct behavior

## Verify
- Shift-click 3 elements → 3 rings visible, label shows "+2"
- Click without shift → selection reset to single
- Delete with multi-select → all removed, single history entry
- Move with multi-select siblings → all move together
- Move disabled when selected elements have different parents
- `bunx playwright test --project=chromium` passes
```

---

## Phase 8: Test Coverage

### Task 8a — Fill test gaps

**Prompt:**
```
Fill test coverage gaps across the editor. Co-locate all tests with source.

## Tests to write

1. `prop-editor/use-on-click-outside.test.ts`:
   - pointerdown inside ref → callback NOT called
   - pointerdown outside ref → callback called
   - cleanup on unmount → listener removed

2. `layout/ghost.test.ts` (if not already covered):
   - Collapsed container (0 height, has children array) → identified as ghost candidate
   - Container with visible height → not a candidate
   - Leaf element → not a candidate

3. `history/history.e2e.ts`:
   - Make edit → Cmd+Z → spec reverts to previous
   - Cmd+Z → Cmd+Shift+Z → spec re-applies
   - Use overlay helpers from `overlay/testing.ts`

4. `context-menu/context-menu.e2e.ts`:
   - Right-click on element → menu appears
   - Menu shows element type + ID
   - Click item → element selected, menu closes
   - Click outside → menu closes
   - Escape → menu closes

5. `spec-ops/clipboard.test.ts` — covered in Phase 5a

6. `spec-ops/insert.test.ts` — covered in Phase 6a

## Patterns
- Unit tests: `bun:test`, co-located `*.test.ts`
- E2E tests: Playwright, co-located `*.e2e.ts`, query by `data-role` or ARIA role
- No mocks except Storage boundary
- Factory functions for test data, not fixtures

## Verify
- `bun test` — all unit tests pass
- `bunx playwright test --project=chromium` — all e2e tests pass
```

---

## Phase 9: MCP Tool Handlers

### Task 9a — Wire editor_status

**Files:**
- Modify: `packages/mcp-server/src/server.ts`

**Prompt:**
```
Wire editor_status to return real data from storage and bridge.

## Context

Current state (server.ts ~line 95): returns hardcoded `{ pages: [], bridge: { ... } }`.

Storage interface: `listPages(): Effect<PageInfo[], StorageError>` where `PageInfo = { name, elementCount, hasDraft }`.
Bridge: `viewers(): Record<string, number>` returns page→connection count.

Both are available in `McpContext` passed to every handler.

## What to build

Replace the stub with:
```ts
Effect.gen(function* () {
  const pages = yield* ctx.storage.listPages();
  return {
    pages,
    bridge: {
      port: ctx.bridge.port,
      viewers: ctx.bridge.viewers(),
    },
  };
})
```

## Verify
- Create a page dir with spec.json → editor_status returns it
- Create spec.draft.json → hasDraft: true
- Bridge has no viewers → empty object
- `bun test packages/mcp-server` passes
```

---

### Task 9b — Wire editor_query (all 8 modes)

**Files:**
- Create: `packages/mcp-server/src/query/` directory with one file per mode
- Modify: `packages/mcp-server/src/server.ts`

**Prompt:**
```
Wire all 8 editor_query modes. Each mode in a separate file under src/query/.

## Modes

1. `outline(spec, depth=2)`:
   - Walk tree from root. Up to depth: include `{ id, type, props, children: [...] }`. Below depth: `{ id, type, childCount }`.
   - Return `{ outline, totalElements }`.

2. `element(spec, elementId)`:
   - Return full element: `{ id, type, props, children, ancestry }`.
   - Ancestry: array of `{ id, type }` from root to parent.
   - Error if not found — include available element IDs in error for agent self-correction.

3. `subtree(spec, elementId)`:
   - Element + all descendants with full props. Use recursive walk.
   - Same error handling as element.

4. `type(spec, componentType)`:
   - Filter spec.elements by type. Return each with ancestry path.
   - Return `{ elements: [...], count }`.

5. `search(spec, query)`:
   - For each element, JSON.stringify each prop value. Case-insensitive includes match.
   - Return `{ results: [{ id, type, propKey, matchedValue, ancestry }], count }`.

6. `selection(bridge, page)`:
   - `bridge.lastSelection(page)` → return selection or `{ selection: null, connected: bridge.hasViewers(page) }`.
   - No error on missing browser — graceful degradation.

7. `capture(bridge, page)`:
   - `bridge.capture(page)` → return file path.
   - Error when no browser or timeout — clear message.

8. `catalog(catalogData)`:
   - No page param needed. Return cached catalog JSON + prompt text.

## Router

In server.ts, replace the stub with:
```ts
const spec = yield* readSpecOrDraft(ctx.storage, args.page);
const handler = queryHandlers[args.what];
if (!handler) return Effect.fail(new InvalidQuery(...));
return handler({ spec, ...args, bridge: ctx.bridge, catalog: ctx.catalog });
```

Helper `readSpecOrDraft`: try readDraft first, fall back to readSpec.

## Verify
- Each mode with demo sample-document.json
- outline depth=1 vs depth=3 → different detail levels
- element with bad ID → error with available IDs
- search "Visual" → finds hero-description
- type "Button" → finds all buttons with ancestry
- selection with no browser → graceful message
- catalog → returns full catalog data
- `bun test` for each mode
```

---

### Task 9c — Wire editor_apply

**Files:**
- Modify: `packages/mcp-server/src/server.ts`

**Prompt:**
```
Wire editor_apply to execute RFC 6902 patches on a draft spec.

## What to build

Replace the stub. Effect.gen pipeline:

1. Read base: `readDraft(page)` ?? `readSpec(page)`
2. `structuredClone(base)` — protect against applySpecPatch mutation
3. Apply patches sequentially via `applySpecPatch` from @json-render/core
4. On failure at op N: return `{ error, failedOpIndex: N }`, NO draft written
5. `validateSpec(result)` → collect warnings (advisory)
6. `autoFixSpec(result)` if fixable issues
7. `writeDraft(page, finalSpec)`
8. Return `{ applied: true, opCount, warnings }`
9. Do NOT return the full spec (too large for MCP responses)

## Verify
- Valid patch → draft created, correct values
- Invalid patch → error with failedOpIndex, no draft written
- Patch 3 of 5 fails → full rollback (no partial draft)
- Validation warning → returned but draft still written
- Apply to existing draft → draft updated (not re-forked from committed)
- `bun test` with test specs
```

---

### Task 9d — Wire editor_commit + editor_discard

**Files:**
- Modify: `packages/mcp-server/src/server.ts`

**Prompt:**
```
Wire editor_commit and editor_discard.

## editor_commit

```ts
Effect.gen(function* () {
  yield* ctx.storage.commitDraft(page);
  const spec = yield* ctx.storage.readSpec(page);
  ctx.bridge.broadcast(page, spec);
  return { committed: true, page, elementCount: Object.keys(spec.elements).length };
})
```
Error if no draft → NotFound.

## editor_discard

```ts
Effect.gen(function* () {
  yield* ctx.storage.discardDraft(page);
  return { discarded: true, page };
})
```
Idempotent — discardDraft already handles missing draft.

## Verify
- apply → commit → readSpec returns patched version, draft gone
- commit broadcasts to bridge (mock WebSocket receives spec-update)
- commit without draft → clear error
- apply → discard → draft gone, readSpec returns original
- discard non-existent → success
```

---

### Task 9e — Browser bridge client

**Files:**
- Create: `packages/editor/src/editor/bridge/use-bridge.ts`
- Create: `packages/editor/src/editor/bridge/index.ts`
- Modify: `packages/editor/src/editor/shell.tsx`

**Prompt:**
```
Connect the editor to the MCP bridge via WebSocket.

## Context

New infrastructure module: `src/editor/bridge/`. Infrastructure layer — no interaction state, no domain imports.

The bridge server (packages/mcp-server/src/bridge/) expects:
- Client sends: `{ type: "ready", page }`, `{ type: "selection-changed", page, elementId }`, `{ type: "capture-response", id, imageBase64 }`
- Client receives: `{ type: "spec-update", spec }`, `{ type: "capture-request", id, elementId? }`

## What to build

1. `use-bridge.ts`:
   ```ts
   type UseBridgeOptions = {
     url: string;
     page: string;
     selectedId: string | null;
     push: SpecPush;
   };

   function useBridge(options: UseBridgeOptions): void
   ```
   - Connect WebSocket to `url`
   - On open: send `{ type: "ready", page }`
   - On `spec-update` message: `push(message.spec, "Agent commit")` — labeled history entry, user can Cmd+Z
   - When `selectedId` changes: send `{ type: "selection-changed", page, elementId: selectedId }`
   - On `capture-request`: defer capture support for now — send `{ type: "capture-response", id, error: "not implemented" }`
   - Auto-reconnect: on close/error, reconnect after 1s, 2s, 4s... max 8s (exponential backoff, 5 retries max)
   - Clean up on unmount
   - Guard: if `spec-update` spec is identical to current spec (by reference or JSON comparison), skip push to avoid loops

2. Wire in `shell.tsx`:
   - Add optional `bridgeUrl?: string` prop to `EditorShellProps`
   - If provided, call `useBridge({ url: bridgeUrl, page: "default", selectedId: lastSelectedId, push })`
   - Editor works without bridge — all bridge features are optional

## Risks
- Infinite loop: bridge sends spec-update → push to history → onSpecChange fires → consumer might re-render. Guard with a "from bridge" flag or spec identity check
- WebSocket in useEffect: must close on unmount. Store ws ref, call ws.close() in cleanup
- Reconnect timer must be cleared on unmount

## Verify
- Start MCP server + dev server with bridgeUrl → browser connects (visible in editor_status)
- Apply + commit via MCP → editor updates live, shows as "Agent commit" in history
- Cmd+Z → reverts agent's change
- Select element → MCP editor_query selection → returns it
- Editor works normally without bridgeUrl prop
```

---

## Deferred / Out of Scope

- **3D exploded view**: spiked and rejected — can't work from overlay (shadow DOM encapsulation), breaks catalog components with overflow/fixed/transform, 5-8 weeks vs 1 day for context menu. Browser DevTools use WebGL reconstruction, not CSS transforms
- **Custom field renderers**: extension seam exists (`getPropField` callback), build when a catalog needs it
- **AI chat in editor**: never — by design
- **Sidebars/toolbars/panels**: zero-chrome principle
- **Page create/delete**: CMS concern, not MCP
- **Drag for multi-select**: single-element drag only
- **Cross-parent bulk move**: too complex, unclear UX
- **CI/CD**: fine without for now

## Decisions Log

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| Style editing | Catalog's job (typed z.object) | Editor CSS inspector | Editor is catalog-agnostic |
| Drop zone label | Parent container label only | Label on indicator line | Line label competes with spatial signal |
| Overlap selection | Right-click context menu | 3D exploded view | 3D breaks isolation, costs 5-8 weeks |
| Delete shortcut | Toolbar only (for now) | Backspace/Delete key | Needs real user testing first |
| Type-to-edit | Yes, printable key → inline edit | Double-click only | Matches Figma/Sketch UX |
| Copy format | JSON fragment on system clipboard | Internal-only | Enables cross-tab paste |
| Insert UX | Toolbar '+' + '/' shortcut | One or the other | Discoverability + power users |
| Multi-select | Shift-click, bulk delete + move | Defer entirely | Users need it for review workflows |
