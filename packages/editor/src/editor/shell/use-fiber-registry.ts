import { useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";
import { createFiberRegistry, type FiberRegistry } from "../fiber/index.js";

export function useFiberRegistry(elementIds: ReadonlySet<string>, data: Data) {
  const idsRef = useRef(elementIds);
  idsRef.current = elementIds;
  const dataRef = useRef(data);
  dataRef.current = data;
  const containerRef = useRef<HTMLDivElement>(null);
  const [registry, setRegistry] = useState<FiberRegistry | null>(null);

  useEffect(function initFiberRegistry() {
    const reg = createFiberRegistry(
      () => idsRef.current,
      () => containerRef.current,
    );
    setRegistry(reg);
    return () => reg.dispose();
  }, []);

  return { registry, containerRef };
}
