import type { Config, ComponentData } from "@puckeditor/core";
import type { Result } from "neverthrow";
import type {
  SectionPattern,
  PatternConfig,
  PatternRegistry,
  DerivedVariation,
  MergeError,
} from "./types.js";
import { isApplicable } from "./match.js";
import { merge } from "./merge.js";
import { deriveVariations } from "./derive.js";

export function createPatternRegistry(
  puckConfig: Config,
  patternConfig: PatternConfig,
): PatternRegistry {
  const derivedByType = new Map<string, DerivedVariation[]>(
    Object.keys(puckConfig.components).map((type) => [
      type,
      deriveVariations(puckConfig, type),
    ]),
  );

  function findApplicable(data: ComponentData): SectionPattern[] {
    return patternConfig.patterns.filter((p) =>
      isApplicable(data, p, patternConfig),
    );
  }

  return {
    findApplicable,
    apply: (
      data: ComponentData,
      pattern: SectionPattern,
    ): Result<ComponentData, MergeError> => merge(data, pattern, patternConfig),
    derive: (componentType: string): DerivedVariation[] =>
      derivedByType.get(componentType) ?? [],
    count: (data: ComponentData): number => findApplicable(data).length,
  };
}
