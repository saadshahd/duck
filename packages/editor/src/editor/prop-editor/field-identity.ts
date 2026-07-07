/** A custom field's `render` receives Puck's `name`/`id`. Real, unique values let
 *  custom controls pair `<label htmlFor>` with their inputs and keep DOM ids
 *  distinct. `name` is the field's dotted path (falling back to the leaf label at
 *  the root); `id` is derived deterministically from the element id + path, so it
 *  stays stable across renders and unique across the document. */
export const fieldIdentity = ({
  elementId,
  path,
  label,
}: {
  elementId: string;
  path?: string;
  label: string;
}): { name: string; id: string } => {
  const name = path || label;
  return {
    name,
    id: `duck-field-${elementId}-${name.replaceAll(".", "-")}`,
  };
};
