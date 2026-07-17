/**
 * Page composition (sp-64 §7.1) — the 8 Almond pages are the same ~14 organisms
 * recomposed, authored as Puck `Data` documents.
 *
 * Authoring is id-free: content is written as bare `{ type, props }` trees (slots nested as
 * child arrays) and `assignIds` mints deterministic, path-based ids at build time. Path ids
 * are pure (no clock/uuid) so a page renders byte-stable, and unique-by-construction across
 * a document — a hand-authored id scheme across 8 pages would be error-prone, and the
 * `remintIds`/`isSlotValue` helpers in spec/patterns require ids to already exist, so they
 * cannot mint from id-free content.
 *
 * Chrome (Header/Footer) is per-page metadata, NOT content: it lives beside `data`, never
 * inside the editable tree (§3.4).
 */

import type { ComponentData, Data } from "@puckeditor/core";
import type { HeaderContent } from "../chrome/header";
import type { FooterContent } from "../chrome/footer";
import type { ThemeName } from "../tokens/themes";

/** An id-free authored component: props may nest slot arrays of further bare components. */
export interface BareComponent {
  type: string;
  props: Record<string, unknown>;
}

export interface AlmondPage {
  id: string;
  title: string;
  /** Page-default theme for the fixed chrome (§3.4); organisms carry their own `theme`. */
  defaultTheme: ThemeName;
  header: HeaderContent;
  footer: FooterContent;
  data: Data;
}

/** A slot value: a non-empty array whose every element is a bare `{ type, props }`. Empty
 *  arrays are left untouched (nothing to mint); non-slot record arrays (a PlanCard's
 *  `features`, a DisclosureBand's `snippets`) lack `type`, so they are never descended. */
const isBareSlot = (value: unknown): value is BareComponent[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (el) =>
      typeof el === "object" &&
      el !== null &&
      typeof (el as BareComponent).type === "string" &&
      typeof (el as BareComponent).props === "object",
  );

/** Mint deterministic path-based ids onto id-free content, descending slot arrays. */
export function assignIds(
  nodes: BareComponent[],
  prefix: string,
): ComponentData[] {
  return nodes.map((node, index) => {
    const id = `${prefix}-${index}`;
    const props = Object.fromEntries(
      Object.entries(node.props).map(([key, value]) =>
        isBareSlot(value)
          ? [key, assignIds(value, `${id}-${key}`)]
          : [key, value],
      ),
    );
    return { type: node.type, props: { ...props, id } };
  });
}

export function almondPage(input: {
  id: string;
  title: string;
  defaultTheme: ThemeName;
  header: HeaderContent;
  footer: FooterContent;
  content: BareComponent[];
}): AlmondPage {
  const { content, ...rest } = input;
  return { ...rest, data: { root: {}, content: assignIds(content, input.id) } };
}
