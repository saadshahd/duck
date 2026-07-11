/**
 * TrustSection — a collection organism: certifications/badges grid (sp-64 §3.3a).
 *
 * Hand-composed from `SectionShell` + `CollectionGrid`. No built-in heading (§3.3a). The
 * slot allows exactly one molecule type, `Certification` (§4). Reflow degrade wraps the
 * dense 2/4-column band at any count.
 */

import type { ComponentConfig, Slot } from "@puckeditor/core";
import type { ReactNode } from "react";
import { CollectionGrid } from "./collection-grid";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";

export interface TrustSectionProps {
  theme: ThemeName;
  items: Slot;
}

function TrustSectionBody({ children }: { children?: ReactNode }) {
  return (
    <CollectionGrid columns={{ base: 2, md: 4 }} degrade={{ rule: "reflow" }}>
      {children}
    </CollectionGrid>
  );
}

export const trustSectionConfig: ComponentConfig<TrustSectionProps> = {
  fields: {
    theme: themeField,
    items: { type: "slot", allow: ["Certification"] },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    items: [
      { type: "Certification", props: { icon: "🛡", label: "FSCS protected" } },
      {
        type: "Certification",
        props: { icon: "🔒", label: "256-bit encryption" },
      },
      { type: "Certification", props: { icon: "✅", label: "FCA regulated" } },
      {
        type: "Certification",
        props: { icon: "🏛", label: "Ring-fenced deposits" },
      },
    ],
  },
  render: ({ theme, items: Items }) => (
    <SectionShell theme={theme}>
      <Items as={TrustSectionBody} />
    </SectionShell>
  ),
};
