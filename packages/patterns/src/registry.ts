import type { Config, ComponentData } from "@puckeditor/core";
import type { Result } from "neverthrow";
import type {
  SectionPattern,
  PatternConfig,
  PatternRegistry,
  DerivedVariation,
  MergeError,
} from "./types.js";
import { fingerprint } from "./fingerprint.js";
import { isApplicable } from "./match.js";
import { merge } from "./merge.js";
import { deriveVariations } from "./derive.js";

export function createPatternRegistry(
  puckConfig: Config,
  patternConfig: PatternConfig,
): PatternRegistry {
  const allFingerprints = [
    ...new Set(patternConfig.patterns.flatMap((p) => p.appliesTo)),
  ];
  const patternsByFingerprint = new Map<string, SectionPattern[]>(
    allFingerprints.map((fp) => [
      fp,
      patternConfig.patterns.filter((p) => p.appliesTo.includes(fp)),
    ]),
  );

  const derivedByType = new Map<string, DerivedVariation[]>(
    Object.keys(puckConfig.components).map((type) => [
      type,
      deriveVariations(puckConfig, type),
    ]),
  );

  function findApplicable(selection: ComponentData): SectionPattern[] {
    const fp = fingerprint(selection);
    const candidates = patternsByFingerprint.get(fp) ?? [];
    return candidates.filter((p) => isApplicable(selection, p, patternConfig));
  }

  return {
    findApplicable,
    apply: (
      selection: ComponentData,
      pattern: SectionPattern,
    ): Result<ComponentData, MergeError> =>
      merge(selection, pattern, patternConfig),
    derive: (componentType: string): DerivedVariation[] =>
      derivedByType.get(componentType) ?? [],
    count: (selection: ComponentData): number =>
      findApplicable(selection).length,
  };
}
