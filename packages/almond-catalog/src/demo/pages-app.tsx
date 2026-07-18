/**
 * Pages harness — renders each of the 8 Almond pages (T11) through Puck's real read-only
 * `<Render>`, under the fixed Header/Footer chrome supplied by PageHarness. The proof: every
 * page is the same recomposed organism set; each organism themes its own subtree via its
 * `data-theme`, so a page reads as one system, and may host a section in a different theme
 * (the Personal landing's Business-themed close). The interactive counterpart is EditorApp.
 */

import { Render } from "@puckeditor/core";
import { config } from "../puck.config";
import { PageHarness } from "./page-harness";

export function PagesApp() {
  return (
    <PageHarness
      renderPage={(page) => <Render config={config} data={page.data} />}
    />
  );
}
