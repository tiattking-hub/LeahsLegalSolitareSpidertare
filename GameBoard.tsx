import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import type { Card } from "@/context/GameContext";
import { PlayingCard } from "./PlayingCard";

const CARD_BACK_IMAGES: Record<string, any> = {
  stvincent:    require("../assets/images/card_back_stvincent.png"),
  barbados:     require("../assets/images/card_back_barbados.png"),
  grenada:      require("../assets/images/card_back_grenada.png"),
  bahamas:      require("../assets/images/card_back_bahamas.png"),
  jamaica:      require("../assets/images/card_back_jamaica.png"),
  england:      require("../assets/images/card_back_england.png"),
  japan:        require("../assets/images/card_back_japan.png"),
  usa:          require("../assets/images/card_back_usa.png"),
  stkitts:      require("../assets/images/card_back_stkitts.png"),
  houseofLords: require("../assets/images/card_back_houseofLords.png"),
  guyana:       require("../assets/images/card_back_guyana.png"),
  australia:    require("../assets/images/card_back_australia.png"),
};
import {
  canMoveCard,
  dealFromStock,
  getHint,
  getMovableSequence,
  getSuitSymbol,
  initGame,
  isGameOver,
  isGameWon,
  moveCards,
  undoMove,
  type GameState,
} from "@/utils/spiderSolitaire";
import type { Difficulty } from "@/app/game-select";

const { width: SCREEN_W } = Dimensions.get("window");
const GUTTER = 2;
const GAP = 1;
const CARD_W = Math.floor((SCREEN_W - GUTTER * 2 - GAP * 9) / 10);
const CARD_H = Math.floor(CARD_W * 1.45);
const CARD_OVERLAP = Math.floor(CARD_H * 0.3);
const TOOLBAR_H = 44;

function diffToSuits(d: Difficulty): 1 | 2 | 4 {
  if (d === "super_easy" || d === "easy") return 1;
  if (d === "medium") return 2;
  return 4;
}
function diffUndoLimit(d: Difficulty): number {
  if (d === "super_easy") return 999;
  if (d === "easy") return 25;
  if (d === "medium") return 15;
  if (d === "hard") return 8;
  return 3;
}

function colLeft(col: number): number {
  return GUTTER + col * (CARD_W + GAP);
}
function xToCol(x: number): number {
  return Math.min(9, Math.max(0, Math.floor((x - GUTTER) / (CARD_W + GAP))));
}

interface Props {
  difficulty: Difficulty;
  onSuitComplete: () => void;
  onGameWon: (score: number) => void;
  onGameOver: (score: number) => void;
  credibilityScore: number;
  setCredibilityScore: (s: number) => void;
  onHintRequest: () => void;
  hintUnlocked: boolean;
  onHintUsed: () => void;
}

interface DragInfo {
  col: number;
  idx: number;
  cards: Card[];
  originX: number;
  originY: number;
}

export function GameBoard({
  difficulty,
  onSuitComplete,
  onGameWon,
  onGameOver,
}: Props) {
  const colors = useColors();
  const { profile } = useGame();
  const backImage = CARD_BACK_IMAGES[profile.selectedCourtroom] ?? CARD_BACK_IMAGES.stvincent;
  const numSuits = useMemo(() => diffToSuits(difficulty), [difficulty]);
  const undoLimit = useMemo(() => diffUndoLimit(difficulty), [difficulty]);

  const [gameState, setGameState] = useState<GameState>(() => initGame(numSuits));
  const [history, setHistory] = useState<GameState[]>([]);
  const [selected, setSelected] = useState<{ col: number; idx: number } | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  const [dragTargetCol, setDragTargetCol] = useState<number | null>(null);
  const [hintMove, setHintMove] = useState<{ fromCol: number; fromIdx: number; toCol: number } | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevCompleted = useRef(0);
  const boardScrollY = useRef(0);
  const dragPan = useRef(new Animated.ValueXY()).current;

  // Always-fresh refs for use inside PanResponder callbacks
  const gsRef = useRef(gameState);
  gsRef.current = gameState;
  const histRef = useRef(history);
  histRef.current = history;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const undoLimitRef = useRef(undoLimit);
  undoLimitRef.current = undoLimit;

  // Drag info ref — stores pending drag details from onStart
  const dragInfoRef = useRef<DragInfo | null>(null);
  const dragActiveRef = useRef(false);

  useEffect(() => {
    if (gameState.completed.length > prevCompleted.current) {
      onSuitComplete();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      prevCompleted.current = gameState.completed.length;
    }
    if (isGameWon(gameState)) onGameWon(gameState.score);
    else if (isGameOver(gameState)) setTimeout(() => onGameOver(gameState.score), 600);
  }, [gameState]);

  const applyMove = useCallback((fromCol: number, fromIdx: number, toCol: number) => {
    setHistory((h) => [...h.slice(-undoLimitRef.current), gsRef.current]);
    setGameState((s) => moveCards(s, fromCol, fromIdx, toCol));
    setSelected(null);
    Haptics.selectionAsync();
  }, []);

  const handleCardPress = useCallback((col: number, idx: number) => {
    if (dragActiveRef.current) return;
    const gs = gsRef.current;
    const card = gs.columns[col]?.[idx];
    if (!card?.faceUp) return;
    Haptics.selectionAsync();
    const sel = selectedRef.current;
    if (sel) {
      if (sel.col === col) { setSelected(null); return; }
      const seq = getMovableSequence(gs.columns[sel.col], sel.idx);
      if (seq.length > 0 && canMoveCard(seq[0], gs.columns[col])) {
        applyMove(sel.col, sel.idx, col);
        return;
      }
    }
    const seq = getMovableSequence(gs.columns[col], idx);
    if (seq.length > 0) setSelected({ col, idx });
  }, [applyMove]);

  const handleColumnPress = useCallback((col: number) => {
    if (dragActiveRef.current) return;
    const sel = selectedRef.current;
    if (!sel) return;
    const gs = gsRef.current;
    const seq = getMovableSequence(gs.columns[sel.col], sel.idx);
    if (seq.length > 0 && canMoveCard(seq[0], gs.columns[col])) {
      applyMove(sel.col, sel.idx, col);
    }
  }, [applyMove]);

  const handleDeal = useCallback(() => {
    const gs = gsRef.current;
    if (gs.stock.length === 0) return;
    setHistory((h) => [...h.slice(-undoLimitRef.current), gs]);
    setGameState((s) => dealFromStock(s));
    setSelected(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleUndo = useCallback(() => {
    const hist = histRef.current;
    if (hist.length === 0) return;
    const result = undoMove(gsRef.current, hist);
    setGameState(result.state);
    setHistory(result.history);
    setSelected(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleNewGame = useCallback(() => {
    Alert.alert("New Game", "Start fresh? Current progress will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Game", onPress: () => {
          setGameState(initGame(numSuits));
          setHistory([]);
          setSelected(null);
          prevCompleted.current = 0;
        },
      },
    ]);
  }, [numSuits]);

  const handleHint = useCallback(() => {
    const hint = getHint(gsRef.current);
    if (!hint) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSelected(null);
    setHintMove(hint);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintMove(null), 2200);
  }, []);

  // Single board-level PanResponder — created once, uses refs internally
  const boardPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const gs = gsRef.current;
        const col = xToCol(locationX);
        if (col < 0 || col >= 10) { dragInfoRef.current = null; return false; }
        const colCards = gs.columns[col];
        if (!colCards || colCards.length === 0) { dragInfoRef.current = null; return false; }

        // Adjust for scroll offset
        const contentY = locationY + boardScrollY.current;
        let touchedIdx = -1;
        for (let i = colCards.length - 1; i >= 0; i--) {
          if (contentY >= i * CARD_OVERLAP) { touchedIdx = i; break; }
        }
        if (touchedIdx < 0) { dragInfoRef.current = null; return false; }
        const card = colCards[touchedIdx];
        if (!card?.faceUp) { dragInfoRef.current = null; return false; }
        const seq = getMovableSequence(colCards, touchedIdx);
        if (seq.length === 0) { dragInfoRef.current = null; return false; }

        dragInfoRef.current = {
          col,
          idx: touchedIdx,
          cards: seq,
          originX: colLeft(col),
          originY: touchedIdx * CARD_OVERLAP - boardScrollY.current + TOOLBAR_H + 52,
        };
        return false; // Let tap through
      },
      onMoveShouldSetPanResponder: (_, g) => {
        if (!dragInfoRef.current) return false;
        return Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6;
      },
      onPanResponderGrant: () => {
        if (!dragInfoRef.current) return;
        dragActiveRef.current = true;
        dragPan.setValue({ x: 0, y: 0 });
        setActiveDrag({ ...dragInfoRef.current });
        setSelected(null);
        Haptics.selectionAsync();
      },
      onPanResponderMove: (_, g) => {
        if (!dragInfoRef.current || !dragActiveRef.current) return;
        dragPan.setValue({ x: g.dx, y: g.dy });
        const currentX = dragInfoRef.current.originX + g.dx + CARD_W / 2;
        const tc = xToCol(currentX);
        setDragTargetCol(tc !== dragInfoRef.current.col && tc >= 0 && tc < 10 ? tc : null);
      },
      onPanResponderRelease: (_, g) => {
        const info = dragInfoRef.current;
        dragActiveRef.current = false;
        if (!info) return;
        const gs = gsRef.current;
        const currentX = info.originX + g.dx + CARD_W / 2;
        const toCol = xToCol(currentX);
        setActiveDrag(null);
        setDragTargetCol(null);
        dragInfoRef.current = null;
        if (toCol >= 0 && toCol < 10 && toCol !== info.col &&
          canMoveCard(info.cards[0], gs.columns[toCol])) {
          setHistory((h) => [...h.slice(-undoLimitRef.current), gs]);
          setGameState((s) => moveCards(s, info.col, info.idx, toCol));
          setSelected(null);
          Haptics.selectionAsync();
        }
      },
      onPanResponderTerminate: () => {
        dragActiveRef.current = false;
        setActiveDrag(null);
        setDragTargetCol(null);
        dragInfoRef.current = null;
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      {/* Top bar: completed suits + stock pile */}
      <View style={styles.topRow}>
        <View style={styles.completedSuits}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.suitSlot,
                {
                  backgroundColor: i < gameState.completed.length
                    ? colors.accent + "dd"
                    : "rgba(201,168,76,0.07)",
                  borderColor: i < gameState.completed.length
                    ? colors.accent
                    : colors.accent + "44",
                },
              ]}
            >
              {i < gameState.completed.length && (
                <Text style={[styles.suitSymbol, { color: "#000" }]}>
                  {getSuitSymbol(gameState.completed[i])}
                </Text>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleDeal}
          disabled={gameState.stock.length === 0}
          style={[
            styles.stockPile,
            {
              backgroundColor: gameState.stock.length > 0
                ? colors.accent + "22"
                : "rgba(255,255,255,0.04)",
              borderColor: gameState.stock.length > 0 ? colors.accent : colors.accent + "33",
              width: CARD_W + 14,
              height: 38,
            },
          ]}
        >
          {gameState.stock.length > 0 ? (
            <>
              <MaterialCommunityIcons name="cards" size={16} color={colors.accent} />
              <Text style={[styles.stockCount, { color: colors.accent }]}>
                {gameState.stock.length}
              </Text>
            </>
          ) : (
            <Text style={[styles.stockCount, { color: colors.accent + "44" }]}>–</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Thin gold separator */}
      <View style={[styles.divider, { backgroundColor: colors.accent + "33" }]} />

      {/* Slim toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.stats}>
          <View style={[styles.statChip, { borderColor: colors.accent + "44" }]}>
            <MaterialCommunityIcons name="star-four-points" size={11} color={colors.accent} />
            <Text style={[styles.statVal, { color: colors.accent }]}>{gameState.score}</Text>
          </View>
          <View style={[styles.statChip, { borderColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name="move" size={11} color="#aaaaaa" />
            <Text style={[styles.statVal, { color: "#aaaaaa" }]}>{gameState.moves}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={history.length === 0}
            style={[
              styles.toolBtn,
              {
                backgroundColor: history.length > 0 ? "rgba(201,168,76,0.14)" : "rgba(255,255,255,0.04)",
                borderColor: history.length > 0 ? colors.accent + "88" : "rgba(255,255,255,0.1)",
              },
            ]}
          >
            <Feather name="rotate-ccw" size={13} color={history.length > 0 ? colors.accent : "#555"} />
            <Text style={[styles.toolLabel, { color: history.length > 0 ? colors.accent : "#555" }]}>
              Undo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleHint}
            style={[styles.toolBtn, { backgroundColor: "rgba(201,168,76,0.18)", borderColor: colors.accent + "88" }]}
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color={colors.accent} />
            <Text style={[styles.toolLabel, { color: colors.accent }]}>Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNewGame}
            style={[styles.toolBtn, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "#ef444466" }]}
          >
            <Feather name="refresh-cw" size={13} color="#ef4444" />
            <Text style={[styles.toolLabel, { color: "#ef4444" }]}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Thin gold separator */}
      <View style={[styles.divider, { backgroundColor: colors.accent + "22" }]} />

      {/* Board columns — felt surface */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { boardScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        style={styles.boardScroll}
        scrollEnabled={activeDrag === null}
      >
        <View style={styles.columns} {...boardPR.panHandlers}>
          {gameState.columns.map((col, colIdx) => {
            const isDragTarget = dragTargetCol === colIdx && activeDrag !== null;
            const isHintTarget = hintMove?.toCol === colIdx && activeDrag === null;
            const colHeight = Math.max(CARD_H, col.length * CARD_OVERLAP + CARD_H - CARD_OVERLAP);
            return (
              <TouchableOpacity
                key={colIdx}
                style={[
                  styles.column,
                  {
                    width: CARD_W,
                    height: colHeight,
                    backgroundColor: isDragTarget
                      ? "rgba(201,168,76,0.12)"
                      : isHintTarget ? "rgba(201,168,76,0.18)" : "transparent",
                    borderRadius: 5,
                    borderWidth: isDragTarget || isHintTarget ? 1.5 : 0,
                    borderColor: isDragTarget || isHintTarget ? "rgba(201,168,76,0.9)" : "transparent",
                    borderStyle: isDragTarget ? "dashed" : "solid",
                  },
                ]}
                onPress={() => handleColumnPress(colIdx)}
                activeOpacity={1}
              >
                {col.length === 0 && (
                  <View
                    style={[
                      styles.emptyCol,
                      { width: CARD_W, height: CARD_H, borderColor: "rgba(201,168,76,0.25)" },
                    ]}
                  />
                )}
                {col.map((card, cardIdx) => {
                  const isDraggingThis = activeDrag?.col === colIdx && cardIdx >= (activeDrag?.idx ?? Infinity);
                  const isSelected = selected?.col === colIdx && cardIdx >= (selected?.idx ?? Infinity);
                  const isHintSource = hintMove?.fromCol === colIdx && cardIdx === hintMove.fromIdx;
                  return (
                    <View
                      key={card.id}
                      style={{
                        position: "absolute",
                        top: cardIdx * CARD_OVERLAP,
                        zIndex: cardIdx + 1,
                        opacity: isDraggingThis ? 0.18 : 1,
                      }}
                    >
                      {isHintSource && (
                        <View style={[StyleSheet.absoluteFill, {
                          borderRadius: 4, borderWidth: 2.5,
                          borderColor: colors.accent, backgroundColor: "rgba(201,168,76,0.18)", zIndex: 99,
                          pointerEvents: "none",
                        }]} />
                      )}
                      <TouchableOpacity
                        onPress={() => handleCardPress(colIdx, cardIdx)}
                        activeOpacity={0.85}
                      >
                        <PlayingCard
                          card={card}
                          width={CARD_W}
                          height={CARD_H}
                          selected={(isSelected || isHintSource) && !isDraggingThis}
                          backImage={backImage}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Drag overlay */}
      {activeDrag && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dragOverlay,
            {
              left: activeDrag.originX,
              top: activeDrag.originY,
              transform: dragPan.getTranslateTransform(),
            },
          ]}
        >
          {activeDrag.cards.map((card, i) => (
            <View
              key={card.id}
              style={{ marginTop: i === 0 ? 0 : -(CARD_H - CARD_OVERLAP) }}
            >
              <PlayingCard card={card} width={CARD_W - 1} height={CARD_H} selected backImage={backImage} />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  completedSuits: {
    flexDirection: "row",
    gap: 3,
    flex: 1,
    flexWrap: "wrap",
    alignItems: "center",
  },
  suitSlot: {
    width: 24,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  suitSymbol: { fontSize: 12, fontWeight: "700" },
  stockPile: {
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flexDirection: "row",
    paddingHorizontal: 6,
  },
  stockCount: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: TOOLBAR_H,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  stats: { flexDirection: "row", gap: 6, alignItems: "center" },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  statVal: { fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 6 },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  toolLabel: { fontSize: 11, fontWeight: "700" },
  boardScroll: { flex: 1, backgroundColor: "transparent" },
  columns: {
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: GUTTER,
    paddingTop: 6,
    paddingBottom: 20,
  },
  column: { position: "relative" },
  emptyCol: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 5,
  },
  dragOverlay: {
    position: "absolute",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
});
