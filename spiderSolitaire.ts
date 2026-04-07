import type { Card, Suit } from "../context/GameContext";

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

export function createDeck(numSuits: 1 | 2 | 4 = 1): Card[] {
  const cards: Card[] = [];
  const suitsToUse = numSuits === 1
    ? (["spades", "spades", "spades", "spades"] as Suit[])
    : numSuits === 2
    ? (["spades", "hearts", "spades", "hearts"] as Suit[])
    : SUITS;

  for (let d = 0; d < 2; d++) {
    for (const suit of suitsToUse) {
      for (let v = 1; v <= 13; v++) {
        cards.push({
          id: `${suit}-${v}-${d}-${Math.random().toString(36).substr(2, 4)}`,
          suit,
          value: v,
          faceUp: false,
        });
      }
    }
  }
  return shuffle(cards);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface GameState {
  columns: Card[][];
  stock: Card[][];
  completed: Suit[];
  moves: number;
  score: number;
}

export function initGame(numSuits: 1 | 2 | 4 = 1): GameState {
  const deck = createDeck(numSuits);
  const columns: Card[][] = Array.from({ length: 10 }, () => []);

  let cardIndex = 0;
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    for (let i = 0; i < count; i++) {
      columns[col].push({ ...deck[cardIndex++], faceUp: i === count - 1 });
    }
  }

  const stockGroups: Card[][] = [];
  while (cardIndex < deck.length) {
    const group: Card[] = [];
    for (let i = 0; i < 10 && cardIndex < deck.length; i++) {
      group.push({ ...deck[cardIndex++], faceUp: false });
    }
    stockGroups.push(group);
  }

  return {
    columns,
    stock: stockGroups,
    completed: [],
    moves: 0,
    score: 500,
  };
}

export function canMoveCard(card: Card, targetColumn: Card[]): boolean {
  if (targetColumn.length === 0) return true;
  const topCard = targetColumn[targetColumn.length - 1];
  return topCard.faceUp && topCard.value === card.value + 1;
}

export function getMovableSequence(column: Card[], fromIndex: number): Card[] {
  const seq: Card[] = [];
  for (let i = fromIndex; i < column.length; i++) {
    if (!column[i].faceUp) return [];
    if (seq.length > 0) {
      const prev = seq[seq.length - 1];
      if (column[i].value !== prev.value - 1 || column[i].suit !== prev.suit) return [];
    }
    seq.push(column[i]);
  }
  return seq;
}

export function moveCards(
  state: GameState,
  fromCol: number,
  fromIdx: number,
  toCol: number
): GameState {
  const newColumns = state.columns.map((col) => [...col]);
  const moving = newColumns[fromCol].splice(fromIdx);
  newColumns[toCol].push(...moving);

  if (newColumns[fromCol].length > 0) {
    const top = newColumns[fromCol][newColumns[fromCol].length - 1];
    if (!top.faceUp) {
      newColumns[fromCol][newColumns[fromCol].length - 1] = { ...top, faceUp: true };
    }
  }

  let completed = [...state.completed];
  let newScore = state.score - 1;

  for (let col = 0; col < newColumns.length; col++) {
    const c = newColumns[col];
    if (c.length >= 13) {
      const topIdx = c.length - 13;
      const seq = c.slice(topIdx);
      if (isCompleteSuit(seq)) {
        completed = [...completed, seq[0].suit];
        newColumns[col] = c.slice(0, topIdx);
        newScore += 100;
        if (newColumns[col].length > 0) {
          const last = newColumns[col][newColumns[col].length - 1];
          if (!last.faceUp) {
            newColumns[col][newColumns[col].length - 1] = { ...last, faceUp: true };
          }
        }
      }
    }
  }

  return {
    ...state,
    columns: newColumns,
    completed,
    moves: state.moves + 1,
    score: newScore,
  };
}

function isCompleteSuit(cards: Card[]): boolean {
  if (cards.length !== 13) return false;
  const suit = cards[0].suit;
  for (let i = 0; i < 13; i++) {
    if (cards[i].suit !== suit || cards[i].value !== 13 - i) return false;
  }
  return true;
}

export function dealFromStock(state: GameState): GameState {
  if (state.stock.length === 0) return state;
  const [group, ...rest] = state.stock;
  const newColumns = state.columns.map((col, i) => [
    ...col,
    { ...group[i], faceUp: true },
  ]);
  return { ...state, columns: newColumns, stock: rest, moves: state.moves + 1, score: state.score - 1 };
}

export function undoMove(current: GameState, history: GameState[]): { state: GameState; history: GameState[] } {
  if (history.length === 0) return { state: current, history };
  const prev = history[history.length - 1];
  return { state: prev, history: history.slice(0, -1) };
}

export function getHint(state: GameState): { fromCol: number; fromIdx: number; toCol: number } | null {
  for (let fromCol = 0; fromCol < state.columns.length; fromCol++) {
    for (let fromIdx = 0; fromIdx < state.columns[fromCol].length; fromIdx++) {
      const seq = getMovableSequence(state.columns[fromCol], fromIdx);
      if (seq.length === 0) continue;
      const card = seq[0];
      for (let toCol = 0; toCol < state.columns.length; toCol++) {
        if (toCol === fromCol) continue;
        if (canMoveCard(card, state.columns[toCol])) {
          return { fromCol, fromIdx, toCol };
        }
      }
    }
  }
  return null;
}

export function isGameWon(state: GameState): boolean {
  return state.completed.length >= 8;
}

export function isGameOver(state: GameState): boolean {
  if (state.stock.length > 0) return false;
  const hint = getHint(state);
  return hint === null && !isGameWon(state);
}

export function getCardLabel(value: number): string {
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case "spades": return "♠";
    case "hearts": return "♥";
    case "diamonds": return "♦";
    case "clubs": return "♣";
  }
}

export function isRedSuit(suit: Suit): boolean {
  return suit === "hearts" || suit === "diamonds";
}
