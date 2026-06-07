import { useContext, type ReactNode } from "react";
import { EnvironmentProvider } from "@ark-ui/react/environment";
import { ShadowContext } from "./shadow-context.js";

/**
 * Feeds Ark UI primitives the editor's live ShadowRoot so their internal DOM
 * queries, focus management, and portals resolve inside the shadow root rather
 * than `document`. Without this, Ark resolves against `document` and its focus
 * trapping / outside-click / portal logic breaks in the open shadow root.
 *
 * Ark's EnvironmentProvider `value` accepts `ShadowRoot | Document | Node` (or a
 * function returning one) — here we pass the ShadowRoot directly. Mount this
 * around any subtree that renders Ark components inside <OverlayRoot>.
 */
export function ArkEnvironment({ children }: { children: ReactNode }) {
  const shadow = useContext(ShadowContext);
  if (!shadow) return children;
  return <EnvironmentProvider value={shadow}>{children}</EnvironmentProvider>;
}
