import { useEffect, useRef, useState } from "react";
import type { Spec } from "@json-render/core";
import { createFiberRegistry, type FiberRegistry } from "../fiber/index.js";

export function useFiberRegistry(elementIds: ReadonlySet<string>, spec: Spec) {
  const idsRef = useRef(elementIds);
  idsRef.current = elementIds;
  const specRef = useRef(spec);
  specRef.current = spec;
  const containerRef = useRef<HTMLDivElement>(null);
  const [registry, setRegistry] = useState<FiberRegistry | null>(null);

  useEffect(function initFiberRegistry() {
    const reg = createFiberRegistry(
      () => idsRef.current,
      () => containerRef.current,
      () => specRef.current.root,
    );
    setRegistry(reg);
    return () => reg.dispose();
  }, []);

  return { registry, containerRef };
}
