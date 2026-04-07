import type { Card, Suit } from "../context/GameContext";
import { shuffle } from "./spiderSolitaire";

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export interface KlondikeState {
  tableau: Card[][];
  foundations: Card[][];
  stock: Card[];
  waste: Card[];
  moves: number;
  score: number;
}

export function createKlondikeDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (let v = 1; v <= 13; v++) {
      cards.push({
        id: `k-${suit}-${v}-${Math.random().toString(36).substr(2, 4)}`,
        suit,
        value: v,
        faceUp: false,
      });
    }
  }
  return shuffle(cards);
}

export function initKlondike(): KlondikeState {
  const deck = createKlondikeDeck();
  const tableau: Card[][] = Array.from({ length: 7 }, () => []);
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ ...deck[idx++], faceUp: row === col });
    }
  }
  const stock = deck.slice(idx).map((c) => ({ ...c, faceUp: false }));
  const foundations: Card[][] = [[], [], [], []];
  return { tableau, foundations, stock, waste: [], moves: 0, score: 0 };
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}

export function canStackTableau(card: Card, target: Card[]): boolean {
  if (target.length === 0) return card.value === 13;
  const top = target[target.length - 1];
  return top.faceUp && top.value === card.value + 1 && isRedSuit(top.suit) !== isRedSuit(card.suit);
}

export function canStackFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.value === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && top.value === card.value - 1;
}

export function getFoundationIndex(suit: Suit): number {
  return SUITS.indexOf(suit);
}

export function drawStock(state: KlondikeState): KlondikeState {
  if (state.stock.length === 0) {
    if (state.waste.length === 0) return state;
    const newStock = [...state.waste].reverse().map((c) => ({ ...c, faceUp: false }));
    return { ...state, stock: newStock, waste: [], moves: state.moves + 1 };
  }
  const card = { ...state.stock[state.stock.length - 1], faceUp: true };
  return {
    ...state,
    stock: state.stock.slice(0, -1),
    waste: [...state.waste, card],
    moves: state.moves + 1,
  };
}

export function moveTableauToFoundation(
  state: KlondikeState,
  tableauCol: number,
): KlondikeState | null {
  const col = state.tableau[tableauCol];
  if (col.length === 0) return null;
  const card = col[col.length - 1];
  if (!card.faceUp) return null;
  const fi = getFoundationIndex(card.suit);
  if (!canStackFoundation(card, state.foundations[fi])) return null;
  const newTableau = state.tableau.map((c, i) => {
    if (i !== tableauCol) return c;
    const next = c.slice(0, -1);
    if (next.length > 0 && !next[next.length - 1].faceUp) {
      next[next.length - 1] = { ...next[next.length - 1], faceUp: true };
    }
    return next;
  });
  const newFoundations = state.foundations.map((f, i) =>
    i === fi ? [...f, { ...card }] : f
  );
  return {
    ...state,
    tableau: newTableau,
    foundations: newFoundations,
    moves: state.moves + 1,
    score: state.score + 10,
  };
}

export function moveWasteToFoundation(state: KlondikeState): KlondikeState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1];
  const fi = getFoundationIndex(card.suit);
  if (!canStackFoundation(card, state.foundations[fi])) return null;
  const newFoundations = state.foundations.map((f, i) =>
    i === fi ? [...f, { ...card }] : f
  );
  return {
    ...state,
    waste: state.waste.slice(0, -1),
    foundations: newFoundations,
    moves: state.moves + 1,
    score: state.score + 10,
  };
}

export function moveTableauToTableau(
  state: KlondikeState,
  fromCol: number,
  fromIdx: number,
  toCol: number,
): KlondikeState | null {
  const from = state.tableau[fromCol];
  if (fromIdx >= from.length) return null;
  const card = from[fromIdx];
  if (!card.faceUp) return null;
  const to = state.tableau[toCol];
  if (!canStackTableau(card, to)) return null;
  const moving = from.slice(fromIdx);
  const newFrom = from.slice(0, fromIdx);
  if (newFrom.length > 0 && !newFrom[newFrom.length - 1].faceUp) {
    newFrom[newFrom.length - 1] = { ...newFrom[newFrom.length - 1], faceUp: true };
  }
  const newTableau = state.tableau.map((col, i) => {
    if (i === fromCol) return newFrom;
    if (i === toCol) return [...col, ...moving];
    return col;
  });
  return {
    ...state,
    tableau: newTableau,
    moves: state.moves + 1,
    score: state.score + 5,
  };
}

export function moveWasteToTableau(
  state: KlondikeState,
  toCol: number,
): KlondikeState | null {
  if (state.waste.length === 0) return null;
  const card = state.waste[state.waste.length - 1];
  const to = state.tableau[toCol];
  if (!canStackTableau(card, to)) return null;
  const newTableau = state.tableau.map((col, i) =>
    i === toCol ? [...col, { ...card }] : col
  );
  return {
    ...state,
    waste: state.waste.slice(0, -1),
    tableau: newTableau,
    moves: state.moves + 1,
    score: state.score + 5,
  };
}

export function isKlondikeWon(state: KlondikeState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

export function getKlondikeHint(
  state: KlondikeState,
): { type: "waste_tableau" | "waste_foundation" | "tableau_foundation" | "tableau_tableau"; fromCol?: number; fromIdx?: number; toCol?: number } | null {
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    const fi = getFoundationIndex(card.suit);
    if (canStackFoundation(card, state.foundations[fi])) return { type: "waste_foundation" };
    for (let tc = 0; tc < 7; tc++) {
      if (canStackTableau(card, state.tableau[tc])) return { type: "waste_tableau", toCol: tc };
    }
  }
  for (let fc = 0; fc < 7; fc++) {
    const col = state.tableau[fc];
    if (col.length === 0) continue;
    const card = col[col.length - 1];
    if (!card.faceUp) continue;
    const fi = getFoundationIndex(card.suit);
    if (canStackFoundation(card, state.foundations[fi])) return { type: "tableau_foundation", fromCol: fc };
  }
  for (let fc = 0; fc < 7; fc++) {
    for (let fi2 = 0; fi2 < state.tableau[fc].length; fi2++) {
      const card = state.tableau[fc][fi2];
      if (!card.faceUp) continue;
      for (let tc = 0; tc < 7; tc++) {
        if (tc === fc) continue;
        if (canStackTableau(card, state.tableau[tc])) {
          return { type: "tableau_tableau", fromCol: fc, fromIdx: fi2, toCol: tc };
        }
      }
    }
  }
  return null;
}

export function getKlondikeCardLabel(value: number): string {
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
}

export function getKlondikeSuitSymbol(suit: Suit): string {
  switch (suit) {
    case "spades": return "♠";
    case "hearts": return "♥";
    case "diamonds": return "♦";
    case "clubs": return "♣";
  }
}
