/**
 * DisclosureBand — a field/free-host organism: approved legal fine-print (sp-64 §3.3b, §6).
 *
 * NOT free authoring — the editor picks WHICH pre-cleared snippets appear, never their
 * wording (§6). `snippets` is an enum-array over `disclosures.ts`: each item names a
 * disclosure id, resolved TOTAL-ly so a stale id is silently dropped rather than inventing
 * a legal statement. The picker is flagged `morphable:false` (§5.4, the enumerated content-
 * resolver set): re-pointing which disclosure shows is content, not a presentational
 * alternative. Carries the uniform `theme` (§5.1) and paints through `SectionShell` with
 * muted craft — small, low-contrast, hairline-separated.
 */

import type { ComponentConfig } from "@puckeditor/core";
import { SectionShell } from "./section-shell";
import { themeField } from "./theme-field";
import { DEFAULT_THEME, type ThemeName } from "../tokens/themes";
import { disclosures, resolveDisclosures } from "../data/disclosures";
import "./disclosure-band.css";

export interface DisclosureRef {
  id: string;
}

export interface DisclosureBandProps {
  theme: ThemeName;
  snippets: DisclosureRef[];
}

const disclosureOptions = Object.values(disclosures).map((d) => ({
  label: d.label,
  value: d.id,
}));

export const disclosureBandConfig: ComponentConfig<DisclosureBandProps> = {
  fields: {
    theme: themeField,
    snippets: {
      type: "array",
      metadata: { morphable: false },
      arrayFields: {
        id: { type: "select", options: disclosureOptions },
      },
    },
  },
  defaultProps: {
    theme: DEFAULT_THEME,
    snippets: [{ id: "deposits" }, { id: "fx" }],
  },
  render: ({ theme, snippets }) => {
    const resolved = resolveDisclosures(snippets.map((s) => s.id));
    return (
      <SectionShell theme={theme}>
        <div className="almond-disclosure">
          {resolved.map((d) => (
            <p key={d.id} className="almond-disclosure__item">
              {d.body}
            </p>
          ))}
        </div>
      </SectionShell>
    );
  },
};
