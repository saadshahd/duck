/** R4 — the overlay's density law. Each interaction state declares its complete,
 *  non-overlapping affordance set; the shell renders the set, never per-element
 *  if-chains. The discriminant is derived once from the parallel machine; the
 *  lookup maps it to the affordances that state owns. Within a state no two
 *  affordances encode the same datum. */

export type InteractionState =
  | "resting-selected"
  | "slot-selected"
  | "dragging"
  | "carrying"
  | "none";

/** Affordances a state owns. Each flag is a distinct datum: identity (rings),
 *  the consolidated label cluster (climb + move + box-model toggle + slot
 *  address), spacing geometry (box-model bands), available ops (action bar),
 *  the slot stop, the drop overlay, and the lift pulse. The boolean is the
 *  state's claim on that affordance; the shell still applies the per-affordance
 *  data preconditions (a single selection, box-model toggled on, etc.). */
export type AffordanceSet = {
  selectionRings: boolean;
  labelCluster: boolean;
  boxModel: boolean;
  actionBar: boolean;
  slotStop: boolean;
  dropOverlay: boolean;
  liftPulse: boolean;
};

const NONE: AffordanceSet = {
  selectionRings: false,
  labelCluster: false,
  boxModel: false,
  actionBar: false,
  slotStop: false,
  dropOverlay: false,
  liftPulse: false,
};

const AFFORDANCES: Record<InteractionState, AffordanceSet> = {
  "resting-selected": {
    selectionRings: true,
    labelCluster: true,
    boxModel: true,
    actionBar: true,
    slotStop: false,
    dropOverlay: false,
    liftPulse: false,
  },
  "slot-selected": {
    selectionRings: false,
    labelCluster: true,
    boxModel: false,
    actionBar: false,
    slotStop: true,
    dropOverlay: false,
    liftPulse: false,
  },
  dragging: {
    selectionRings: false,
    labelCluster: false,
    boxModel: false,
    actionBar: false,
    slotStop: false,
    dropOverlay: true,
    liftPulse: false,
  },
  carrying: {
    selectionRings: false,
    labelCluster: false,
    boxModel: false,
    actionBar: false,
    slotStop: false,
    dropOverlay: true,
    liftPulse: true,
  },
  none: NONE,
};

/** Collapse the parallel machine's pointer + drag regions into one interaction
 *  discriminant. Drag wins over pointer (T1 transitions pointer out of selected
 *  on DRAG_START/CARRY_START, but reading drag first keeps the precedence
 *  explicit). `editing` and `inserting` are overlays layered on top of
 *  resting-selected — their pickers are contextual sub-affordances the shell
 *  gates separately, so they resolve to resting-selected here. */
export const interactionState = ({
  pointer,
  drag,
  hasSelection,
  hasSlot,
}: {
  pointer: string;
  drag: string;
  hasSelection: boolean;
  hasSlot: boolean;
}): InteractionState => {
  if (drag === "carrying") return "carrying";
  if (drag === "dragging") return "dragging";
  if (pointer === "slot-selected" && hasSlot) return "slot-selected";
  if (
    (pointer === "selected" ||
      pointer === "editing" ||
      pointer === "inserting") &&
    hasSelection
  )
    return "resting-selected";
  return "none";
};

export const affordancesFor = (state: InteractionState): AffordanceSet =>
  AFFORDANCES[state];
