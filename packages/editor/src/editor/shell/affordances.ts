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
 *  the slot stop, the drop overlay, the lift pulse, and the cycle chip (the
 *  modality's cycle disclosure shown during drag and carry). The boolean is the state's claim
 *  on that affordance; the shell still applies the per-affordance data
 *  preconditions (a single selection, box-model toggled on, etc.). */
export type AffordanceSet = {
  selectionRings: boolean;
  labelCluster: boolean;
  boxModel: boolean;
  actionBar: boolean;
  slotStop: boolean;
  /** Inline insert (+) inside the slot band. Owned exclusively by slot-selected. */
  slotInsert: boolean;
  dropOverlay: boolean;
  liftPulse: boolean;
  /** N-of-M cycle chip shown when cycling through destinations. Owned by dragging and carrying. */
  cycleChip: boolean;
};

const NONE: AffordanceSet = {
  selectionRings: false,
  labelCluster: false,
  boxModel: false,
  actionBar: false,
  slotStop: false,
  slotInsert: false,
  dropOverlay: false,
  liftPulse: false,
  cycleChip: false,
};

const AFFORDANCES: Record<InteractionState, AffordanceSet> = {
  "resting-selected": {
    selectionRings: true,
    labelCluster: true,
    boxModel: true,
    actionBar: true,
    slotStop: false,
    slotInsert: false,
    dropOverlay: false,
    liftPulse: false,
    cycleChip: false,
  },
  "slot-selected": {
    selectionRings: false,
    labelCluster: false,
    boxModel: false,
    actionBar: false,
    slotStop: true,
    slotInsert: true,
    dropOverlay: false,
    liftPulse: false,
    cycleChip: false,
  },
  dragging: {
    selectionRings: false,
    labelCluster: false,
    boxModel: false,
    actionBar: false,
    slotStop: false,
    slotInsert: false,
    dropOverlay: true,
    liftPulse: false,
    cycleChip: true,
  },
  carrying: {
    selectionRings: false,
    labelCluster: false,
    boxModel: false,
    actionBar: false,
    slotStop: false,
    slotInsert: false,
    dropOverlay: true,
    liftPulse: true,
    cycleChip: true,
  },
  none: NONE,
};

/** Collapse the parallel machine's pointer + drag regions into one interaction
 *  discriminant. Drag wins over pointer (T1 transitions pointer out of selected
 *  on DRAG_START/CARRY_START, but reading drag first keeps the precedence
 *  explicit). `editing` and `inserting` are overlays layered on top of
 *  resting-selected — their pickers are contextual sub-affordances the shell
 *  gates separately, so they resolve to resting-selected here. `inserting` while
 *  a slot is chosen (hasSlot) keeps the slot-selected affordances so the slot
 *  bands stay painted under the picker. */
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
  if ((pointer === "slot-selected" || pointer === "inserting") && hasSlot)
    return "slot-selected";
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
