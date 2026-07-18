/**
 * Editor harness — the 8 Almond pages (T11) opened in the REAL interactive Duck editor
 * (`<Editor>` from `@duckeditor/core`), not Puck's read-only `<Render>`. Select a page from
 * the shared switcher, then click any element to select / edit props / morph it through the
 * overlay. The editor owns only `page.data`; the fixed chrome around it lives in PageHarness.
 *
 * Keyed by page id so switching pages opens a fresh editing session on that page's document.
 */

import { Editor } from "@duckeditor/core";
import { patternConfig } from "../pattern.config";
import { config } from "../puck.config";
import { PageHarness } from "./page-harness";

export function EditorApp() {
  return (
    <PageHarness
      renderPage={(page) => (
        <Editor
          key={page.id}
          data={page.data}
          config={config}
          patternConfig={patternConfig}
        />
      )}
    />
  );
}
