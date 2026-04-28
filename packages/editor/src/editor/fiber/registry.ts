import {
  type Fiber,
  getFiberFromHostInstance,
  getNearestHostFiber,
  instrument,
  secure,
  traverseFiber,
} from "bippy";

export type FiberRegistry = {
  readonly get: (nodeId: string) => HTMLElement | undefined;
  readonly getNodeId: (element: Element) => string | undefined;
  readonly dispose: () => void;
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
  let currentIds: ReadonlySet<string> = new Set();
  let disposed = false;

  const register = (id: string, el: HTMLElement) => {
    map.set(id, el);
    reverseMap.set(el, id);
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
        const container = getRootContainer?.();
        traverseFiber(root.current as Fiber, (fiber) => {
          if (!fiber.key) return;
          const id = stripReactKeyPrefix(fiber.key);
          const el = currentIds.has(id) ? fiberToElement(fiber) : undefined;
          if (el && (!container || container.contains(el))) register(id, el);
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
    dispose: () => {
      disposed = true;
      map.clear();
      reverseMap.clear();
    },
  };
}
