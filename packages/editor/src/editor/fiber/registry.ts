import {
  type Fiber,
  getFiberFromHostInstance,
  getNearestHostFiber,
  instrument,
  secure,
  traverseFiber,
} from "bippy";

export type SlotKey = { parentId: string; slotKey: string };

export type FiberRegistry = {
  readonly get: (nodeId: string) => HTMLElement | undefined;
  readonly getNodeId: (element: Element) => string | undefined;
  readonly getSlot: (
    parentId: string,
    slotKey: string,
  ) => HTMLElement | undefined;
  readonly getSlotAt: (element: Element) => SlotKey | undefined;
  readonly dispose: () => void;
};

const slotKeyOf = (slot: SlotKey): string => `${slot.parentId}:${slot.slotKey}`;

/** Detect Puck's SlotRender fiber by the props it receives:
 *  - `componentId` is the parent component's spec id
 *  - `zone` is the slot prop name */
const slotKeyFromFiber = (fiber: Fiber): SlotKey | undefined => {
  const props = fiber.memoizedProps as
    | { componentId?: unknown; zone?: unknown }
    | null
    | undefined;
  if (!props) return undefined;
  const { componentId, zone } = props;
  if (typeof componentId !== "string" || typeof zone !== "string")
    return undefined;
  return { parentId: componentId, slotKey: zone };
};

/** React prefixes array-child keys with ".$". Strip to recover the element ID. */
export function stripReactKeyPrefix(fiberKey: string): string {
  return fiberKey.startsWith(".$") ? fiberKey.slice(2) : fiberKey;
}

function fiberToElement(fiber: Fiber): HTMLElement | undefined {
  const host = getNearestHostFiber(fiber);
  return host?.stateNode instanceof HTMLElement ? host.stateNode : undefined;
}

export function createFiberRegistry(
  getNodeIds: () => ReadonlySet<string>,
  getRootContainer?: () => HTMLElement | null,
  getRootId?: () => string | undefined,
): FiberRegistry {
  const map = new Map<string, HTMLElement>();
  const reverseMap = new Map<Element, string>();
  const slotMap = new Map<string, HTMLElement>();
  const slotFiberMap = new Map<string, Fiber>();
  let currentIds: ReadonlySet<string> = new Set();
  let disposed = false;

  const register = (id: string, el: HTMLElement) => {
    map.set(id, el);
    reverseMap.set(el, id);
  };

  const registerSlot = (slot: SlotKey, fiber: Fiber) => {
    const key = slotKeyOf(slot);
    slotFiberMap.set(key, fiber);
    const el = fiberToElement(fiber);
    if (el) slotMap.set(key, el);
  };

  // Puck's root render doesn't key to a component id,
  // so it's invisible to the keyed-fiber pass. Fall back to DOM.
  const registerRoot = () => {
    const rootId = getRootId?.();
    const container = getRootContainer?.();
    if (!rootId || !container || !currentIds.has(rootId) || map.has(rootId))
      return;
    const el = container.firstElementChild;
    if (el instanceof HTMLElement) register(rootId, el);
  };

  instrument(
    secure({
      onCommitFiberRoot(_rendererID, root) {
        if (disposed) return;
        currentIds = getNodeIds();
        map.clear();
        reverseMap.clear();
        slotMap.clear();
        slotFiberMap.clear();
        const container = getRootContainer?.();
        traverseFiber(root.current as Fiber, (fiber) => {
          if (fiber.key) {
            const id = stripReactKeyPrefix(fiber.key);
            const el = currentIds.has(id) ? fiberToElement(fiber) : undefined;
            if (
              el &&
              (!container || container.contains(el)) &&
              !el.closest("[data-duck-overlay]")
            )
              register(id, el);
          }
          const slot = slotKeyFromFiber(fiber);
          if (slot && currentIds.has(slot.parentId)) registerSlot(slot, fiber);
        });
        registerRoot();
      },
    }),
  );

  const isKnownKey = (key: string | null): key is string =>
    !!key && currentIds.has(stripReactKeyPrefix(key));

  return {
    get: (nodeId) => map.get(nodeId),
    getNodeId: (element) => {
      const found = reverseMap.get(element);
      if (found) return found;
      const match = traverseFiber(
        getFiberFromHostInstance(element),
        (f) => isKnownKey(f.key),
        true,
      );
      if (!match?.key) return undefined;
      return stripReactKeyPrefix(match.key);
    },
    getSlot: (parentId, slotKey) =>
      slotMap.get(slotKeyOf({ parentId, slotKey })),
    getSlotAt: (element) => {
      const start = getFiberFromHostInstance(element);
      const match = traverseFiber(start, (f) => !!slotKeyFromFiber(f), true);
      return match ? slotKeyFromFiber(match) : undefined;
    },
    dispose: () => {
      disposed = true;
      map.clear();
      reverseMap.clear();
      slotMap.clear();
      slotFiberMap.clear();
    },
  };
}
