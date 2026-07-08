import type { Config, Data, Field } from "@puckeditor/core";
import { PuckFields } from "./puck-fields.js";

/** The element wrapper both the static-markup and act-based PuckFields suites
 *  mount, over an empty document/catalog and a no-op commit. */
const emptyData: Data = { content: [], root: { props: {} } };
const emptyConfig: Config = { components: {} };
const noopCommit = () => ({ status: "unchanged" as const });

export const fieldsTree = (fields: Record<string, Field>) => (
  <PuckFields
    fields={fields}
    values={{}}
    onChange={() => {}}
    elementId="test"
    data={emptyData}
    config={emptyConfig}
    commit={noopCommit}
  />
);
