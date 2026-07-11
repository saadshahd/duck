/**
 * themeField — the uniform `theme` picker every editable organism carries (sp-64 §5.1).
 *
 * A `select` over the full 6-theme enum, in the deterministic THEME_ORDER, labelled from
 * the theme library. The morph graph (§5.1) makes `theme` a quick-variant on every
 * organism uniformly; the picker's current-theme filtering and the generic `morphable`
 * flag land later (T8/T9). Here it is a plain field so the value round-trips through data
 * and drives the organism's `SectionShell data-theme`. Shared because T5–T7 organisms all
 * declare the identical field — DRY at the field level, not a per-organism literal.
 */

import type { Field } from "@puckeditor/core";
import { THEME_ORDER, THEMES, type ThemeName } from "../tokens/themes";

export const themeField: Field<ThemeName> = {
  type: "select",
  options: THEME_ORDER.map((name) => ({
    label: THEMES[name].label,
    value: name,
  })),
};
