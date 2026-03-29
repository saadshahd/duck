import { setup } from "xstate";

export type TimelineVisibilityEvent =
  | { type: "SHOW" }
  | { type: "MOUSE_ENTER" }
  | { type: "MOUSE_LEAVE" };

export const timelineVisibilityMachine = setup({
  types: {
    events: {} as TimelineVisibilityEvent,
  },
  delays: {
    autoHide: 3000,
    staleTimeout: 1500,
    fadeOut: 300,
  },
}).createMachine({
  id: "timelineVisibility",
  initial: "hidden",
  states: {
    hidden: {
      on: { SHOW: "visible" },
    },
    visible: {
      after: { autoHide: "fading" },
      on: {
        SHOW: { target: "visible", reenter: true },
        MOUSE_ENTER: "interactive",
      },
    },
    interactive: {
      on: {
        MOUSE_LEAVE: "stale",
        SHOW: {},
      },
    },
    stale: {
      after: { staleTimeout: "fading" },
      on: {
        MOUSE_ENTER: "interactive",
        SHOW: "visible",
      },
    },
    fading: {
      after: { fadeOut: "hidden" },
      on: {
        MOUSE_ENTER: "interactive",
        SHOW: "visible",
      },
    },
  },
});
