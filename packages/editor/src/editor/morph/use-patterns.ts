import { useEffect, useMemo, useState } from "react";
import type { Config } from "@puckeditor/core";
import type {
  PatternConfig,
  PatternRegistry,
  RemintIds,
} from "@duckeditor/patterns";

type PatternsModule = typeof import("@duckeditor/patterns");

type Patterns = {
  registry: PatternRegistry | null;
  remintIds: RemintIds | null;
};

const EMPTY: Patterns = { registry: null, remintIds: null };

export function usePatterns(
  config: Config,
  patternConfig: PatternConfig | undefined,
): Patterns {
  const [module, setModule] = useState<PatternsModule | null>(null);

  useEffect(() => {
    if (!patternConfig) return;
    let cancelled = false;
    import("@duckeditor/patterns")
      .then((m) => {
        if (!cancelled) setModule(m);
      })
      .catch((cause) => {
        console.error("[duck] @duckeditor/patterns failed to load", cause);
      });
    return () => {
      cancelled = true;
    };
  }, [patternConfig]);

  return useMemo(() => {
    if (!module || !patternConfig) return EMPTY;
    return {
      registry: module.createPatternRegistry(config, patternConfig),
      remintIds: module.remintIds,
    };
  }, [module, config, patternConfig]);
}
