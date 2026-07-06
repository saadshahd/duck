import { useCallback, useEffect, useRef, useState } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { collectDescendants, findParent } from "@duckeditor/spec";
import { copy, paste, remove, type SpecOpsError } from "../spec-ops/index.js";
import { type ClipboardActions, type EditorCommit } from "../types.js";
import { Fragment } from "./fragment.js";

type ClipboardDeps = {
  data: Data;
  config: Config;
  lastSelectedId: string | null;
  commit: EditorCommit;
  onSelect: (elementIds: string[]) => void;
  onDeselect: () => void;
};

const NOTICE_MS = 5000;

const SYSTEM_WRITE_BLOCKED =
  "System clipboard unavailable. Kept in editor clipboard.";

const failed = (op: string, error: SpecOpsError): string =>
  `${op} failed: ${error.tag.replaceAll("-", " ")}.`;

type SystemRead =
  { status: "read"; component?: ComponentData } | { status: "blocked" };

const readSystem = (): Promise<SystemRead> =>
  navigator.clipboard.readText().then(
    (text): SystemRead => ({ status: "read", component: Fragment.parse(text) }),
    (): SystemRead => ({ status: "blocked" }),
  );

/** Where to paste relative to the current selection.
 *  Paste as next sibling of selected; appends to top-level if no selection. */
const pastePosition = (
  data: Data,
  selectedId: string | null,
): {
  parentId: string | null;
  slotKey: string | null;
  index: number;
} | null => {
  if (!selectedId) {
    return { parentId: null, slotKey: null, index: data.content.length };
  }
  const parent = findParent(data, selectedId);
  if (!parent) return null;
  return { ...parent, index: parent.index + 1 };
};

/** Copy/cut/paste over an in-editor fragment store, with the system clipboard
 *  as best-effort interop on top. The store is the write target that cannot
 *  fail; system clipboard failures surface through `notice` (aria-live). */
export function useClipboard(
  deps: ClipboardDeps,
): ClipboardActions & { notice: string } {
  const ref = useRef(deps);
  ref.current = deps;

  const storeRef = useRef<ComponentData | undefined>(undefined);

  const [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const announce = useCallback((message: string) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), NOTICE_MS);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const capture = useCallback(
    (component: ComponentData) => {
      storeRef.current = component;
      navigator.clipboard
        .writeText(Fragment.serialize(component))
        .catch(() => announce(SYSTEM_WRITE_BLOCKED));
    },
    [announce],
  );

  const onCopy = useCallback(() => {
    const { data, lastSelectedId } = ref.current;
    if (!lastSelectedId) return;
    copy(data, lastSelectedId).match(capture, (error) =>
      announce(failed("Copy", error)),
    );
  }, [capture, announce]);

  const onCut = useCallback(() => {
    const { data, lastSelectedId, commit, onDeselect } = ref.current;
    if (!lastSelectedId) return;
    const removedIds = [
      lastSelectedId,
      ...collectDescendants(data, lastSelectedId),
    ];
    copy(data, lastSelectedId)
      .andThen((component) => {
        capture(component);
        return remove(data, lastSelectedId);
      })
      .match(
        (next) => {
          commit({
            beforeData: data,
            afterData: next,
            label: "Cut",
            resolve: { kind: "remove", ids: removedIds },
          });
          onDeselect();
        },
        (error) => announce(failed("Cut", error)),
      );
  }, [capture, announce]);

  const onPaste = useCallback(async () => {
    const system = await readSystem();
    const systemComponent =
      system.status === "read" ? system.component : undefined;
    const component = systemComponent ?? storeRef.current;
    const isSystemBlocked = system.status === "blocked";
    if (!component) {
      announce(
        isSystemBlocked
          ? "Nothing to paste. System clipboard unavailable."
          : "Nothing to paste.",
      );
      return;
    }

    const { data, config, lastSelectedId, commit, onSelect } = ref.current;
    const position = pastePosition(data, lastSelectedId);
    if (!position) {
      announce("Paste failed: no destination for the current selection.");
      return;
    }

    paste(
      data,
      position.parentId,
      position.slotKey,
      component,
      config,
      position.index,
    ).match(
      ({ data: next, id }) => {
        commit({
          beforeData: data,
          afterData: next,
          label: "Pasted",
          resolve: { kind: "insert", id },
        });
        onSelect([id]);
        if (isSystemBlocked) {
          announce(
            "Pasted from editor clipboard. System clipboard unavailable.",
          );
        }
      },
      (error) => announce(failed("Paste", error)),
    );
  }, [announce]);

  const onDuplicate = useCallback(() => {
    const { data, config, lastSelectedId, commit, onSelect } = ref.current;
    if (!lastSelectedId) return;
    const parent = findParent(data, lastSelectedId);
    if (!parent) return;
    copy(data, lastSelectedId)
      .andThen((component) =>
        paste(
          data,
          parent.parentId,
          parent.slotKey,
          component,
          config,
          parent.index + 1,
        ),
      )
      .map(({ data: next, id }) => {
        commit({
          beforeData: data,
          afterData: next,
          label: "Duplicated",
          resolve: { kind: "insert", id },
        });
        onSelect([id]);
      });
  }, []);

  return { onCopy, onCut, onPaste, onDuplicate, notice };
}
