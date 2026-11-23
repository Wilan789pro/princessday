/**
 * Locked-door refusals for the 25th Chamber.
 * Pure functions only: this module decides which playful line to show next.
 * It has NO access to (and no say over) whether the chamber can open.
 */

export type DoorReaction = 'shake' | 'flash' | 'sparkle' | 'wobble';
export const DOOR_REACTIONS: readonly DoorReaction[] = ['shake', 'flash', 'sparkle', 'wobble'];

export interface DoorState {
  /** Cosmetic counter only. Never used for access decisions. */
  presses: number;
  /** Indices still to be shown in the current shuffle bag. */
  bag: number[];
  /** Index shown last (null before the first bag pick). */
  last: number | null;
}

export const initialDoorState = (): DoorState => ({ presses: 0, bag: [], last: null });

function shuffle(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Shuffle-bag pick: every index 0..total-1 is used once before any repeats, and
 * a fresh bag never starts with the index that was shown last.
 * Returns index -1 when there is nothing to pick.
 */
export function nextRefusal(bag: readonly number[], last: number | null, total: number, rng: () => number = Math.random): { index: number; bag: number[] } {
  if (total <= 0) return { index: -1, bag: [] };
  if (total === 1) return { index: 0, bag: [] };
  let next = bag.filter((i) => i >= 0 && i < total);
  if (next.length === 0) {
    next = shuffle(total, rng);
    if (next[0] === last) [next[0], next[1]] = [next[1], next[0]];
  }
  const [index, ...rest] = next;
  return { index, bag: rest };
}

export interface RefusalContent {
  /** Shown in order on the first presses. */
  opening: readonly string[];
  /** The shuffled pool used afterwards (openers included). */
  pool: readonly string[];
  /** Optional one-off lines for exact press numbers (do not consume the bag). */
  special?: Readonly<Record<number, string>>;
}

/** One press of the locked door → the next message and visual reaction. */
export function pressLockedDoor(state: DoorState, content: RefusalContent, rng: () => number = Math.random): { state: DoorState; message: string; reaction: DoorReaction } {
  const presses = state.presses + 1;
  const reaction = DOOR_REACTIONS[(presses - 1) % DOOR_REACTIONS.length];
  const special = content.special?.[presses];
  if (special) return { state: { ...state, presses }, message: special, reaction };
  if (presses <= content.opening.length) {
    // The pool starts with the openers, so remember this one as "last shown":
    // the first shuffled pick can then never repeat it.
    const shown = content.pool.indexOf(content.opening[presses - 1]);
    return { state: { ...state, presses, last: shown >= 0 ? shown : state.last }, message: content.opening[presses - 1], reaction };
  }
  const { index, bag } = nextRefusal(state.bag, state.last, content.pool.length, rng);
  const message = index >= 0 ? content.pool[index] : content.opening[content.opening.length - 1] ?? '';
  return { state: { presses, bag, last: index >= 0 ? index : state.last }, message, reaction };
}
