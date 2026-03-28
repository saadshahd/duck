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
): FiberRegistry {
  const map = new Map<string, HTMLElement>();
  let currentIds: ReadonlySet<string> = new Set();
  let disposed = false;

  instrument(
    secure({
      onCommitFiberRoot(_rendererID, root) {
        if (disposed) return;
        currentIds = getNodeIds();
        map.clear();
        traverseFiber(root.current as Fiber, (fiber) => {
          if (!fiber.key) return;
          const id = stripReactKeyPrefix(fiber.key);
          const el = currentIds.has(id) ? fiberToElement(fiber) : undefined;
          if (el) map.set(id, el);
        });
      },
    }),
  );

  const isKnownKey = (key: string | null): key is string =>
    !!key && currentIds.has(stripReactKeyPrefix(key));

  return {
    get: (nodeId) => map.get(nodeId),
    getNodeId: (element) => {
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
    },
  };
}
