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
  initKlondike,
  drawStock,
  getKlondikeHint,
  moveTableauToFoundation,
  moveTableauToTableau,
  moveWasteToFoundation,
  moveWasteToTableau,
  isKlondikeWon,
  type KlondikeState,
} from "@/utils/klondikeSolitaire";
import type { Difficulty } from "@/app/game-select";

const { width: SCREEN_W } = Dimensions.get("window");
const GUTTER = 6;
const GAP = 4;
const CARD_W = Math.floor((SCREEN_W - GUTTER * 2 - GAP * 6) / 7);
const CARD_H = Math.floor(CARD_W * 1.42);
const CARD_OVERLAP = Math.floor(CARD_H * 0.32);
const TOOLBAR_H = 46;
const TOP_ROW_H = CARD_H * 0.85 + 20;

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
function xToTableauCol(x: number): number {
  return Math.min(6, Math.max(0, Math.floor((x - GUTTER) / (CARD_W + GAP))));
}

interface DragInfo {
  cards: Card[];
  fromCol: number;
  fromIdx: number;
  originX: number;
  originY: number;
}

interface Props {
  difficulty: Difficulty;
  onGameWon: (score: number) => void;
  onGameOver: (score: number) => void;
  onSuitComplete: () => void;
}

export function KlondikeBoard({ difficulty, onGameWon, onGameOver, onSuitComplete }: Props) {
  const colors = useColors();
  const { profile } = useGame();
  const backImage = CARD_BACK_IMAGES[profile.selectedCourtroom] ?? CARD_BACK_IMAGES.stvincent;
  const undoLimit = useMemo(() => diffUndoLimit(difficulty), [difficulty]);

  const [state, setState] = useState<KlondikeState>(() => initKlondike());
  const [history, setHistory] = useState<KlondikeState[]>([]);
  const [selected, setSelected] = useState<{ col: number; idx: number } | "waste" | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  const [dragTargetCol, setDragTargetCol] = useState<number | null>(null);
  const [hintHighlight, setHintHighlight] = useState<{
    waste?: boolean; foundation?: boolean; fromCol?: number; fromIdx?: number; toCol?: number;
  } | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prevFoundLen = useRef(0);
  const boardScrollY = useRef(0);
  const dragPan = useRef(new Animated.ValueXY()).current;

  // Always-fresh refs for PanResponder callbacks
  const stateRef = useRef(state);
  stateRef.current = state;
  const historyRef = useRef(history);
  historyRef.current = history;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const undoLimitRef = useRef(undoLimit);
  undoLimitRef.current = undoLimit;

  const dragInfoRef = useRef<DragInfo | null>(null);
  const dragActiveRef = useRef(false);

  useEffect(() => {
    // Only trigger question on every 5th foundation card (not every single one)
    const total = state.foundations.reduce((sum, f) => sum + f.length, 0);
    if (total > prevFoundLen.current) {
      if (total % 5 === 0) onSuitComplete();
      prevFoundLen.current = total;
    }
    if (isKlondikeWon(state)) onGameWon(state.score);
  }, [state]);

  const push = useCallback((next: KlondikeState) => {
    setHistory((h) => [...h.slice(-undoLimitRef.current), stateRef.current]);
    setState(next);
    setSelected(null);
    Haptics.selectionAsync();
  }, []);

  const handleUndo = useCallback(() => {
    const hist = historyRef.current;
    if (hist.length === 0) return;
    setState(hist[hist.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleDraw = useCallback(() => {
    push(drawStock(stateRef.current));
  }, [push]);

  const handleNewGame = useCallback(() => {
    Alert.alert("New Game", "Start fresh?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Game",
        onPress: () => {
          setState(initKlondike());
          setHistory([]);
          setSelected(null);
          prevFoundLen.current = 0;
        },
      },
    ]);
  }, []);

  const handleHint = useCallback(() => {
    const hint = getKlondikeHint(stateRef.current);
    if (!hint) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSelected(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    const h: typeof hintHighlight = {};
    if (hint.type === "waste_foundation") { h.waste = true; h.foundation = true; }
    else if (hint.type === "waste_tableau") { h.waste = true; h.toCol = hint.toCol; }
    else if (hint.type === "tableau_foundation") { h.fromCol = hint.fromCol; h.foundation = true; }
    else if (hint.type === "tableau_tableau") {
      h.fromCol = hint.fromCol; h.fromIdx = hint.fromIdx; h.toCol = hint.toCol;
    }
    setHintHighlight(h);
    hintTimerRef.current = setTimeout(() => setHintHighlight(null), 2200);
  }, []);

  const handleWastePress = useCallback(() => {
    const s = stateRef.current;
    if (s.waste.length === 0) return;
    if (selectedRef.current === "waste") { setSelected(null); return; }
    const res = moveWasteToFoundation(s);
    if (res) { push(res); return; }
    setSelected("waste");
    Haptics.selectionAsync();
  }, [push]);

  const handleTableauPress = useCallback((col: number, idx: number) => {
    if (dragActiveRef.current) return;
    const s = stateRef.current;
    const card = s.tableau[col]?.[idx];
    if (!card?.faceUp) return;
    const sel = selectedRef.current;

    if (sel === "waste") {
      const res = moveWasteToTableau(s, col);
      if (res) { push(res); return; }
    } else if (sel && typeof sel === "object") {
      if (sel.col === col) { setSelected(null); return; }
      const res = moveTableauToTableau(s, sel.col, sel.idx, col);
      if (res) { push(res); return; }
    } else {
      // Try auto-move to foundation
      if (idx === s.tableau[col].length - 1) {
        const res = moveTableauToFoundation(s, col);
        if (res) { push(res); return; }
      }
    }
    setSelected({ col, idx });
    Haptics.selectionAsync();
  }, [push]);

  const handleFoundationPress = useCallback(() => {
    const s = stateRef.current;
    const sel = selectedRef.current;
    if (sel === "waste") {
      const res = moveWasteToFoundation(s);
      if (res) { push(res); }
    }
  }, [push]);

  const handleEmptyCol = useCallback((col: number) => {
    const s = stateRef.current;
    const sel = selectedRef.current;
    if (sel === "waste") {
      const res = moveWasteToTableau(s, col);
      if (res) { push(res); }
    } else if (sel && typeof sel === "object") {
      const res = moveTableauToTableau(s, sel.col, sel.idx, col);
      if (res) { push(res); }
    }
  }, [push]);

  // Single board-level PanResponder for tableau drag
  const boardPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const s = stateRef.current;
        const col = xToTableauCol(locationX);
        if (col < 0 || col >= 7) { dragInfoRef.current = null; return false; }

        const colCards = s.tableau[col];
        if (!colCards || colCards.length === 0) { dragInfoRef.current = null; return false; }

        const contentY = locationY + boardScrollY.current;
        let touchedIdx = -1;
        for (let i = colCards.length - 1; i >= 0; i--) {
          if (contentY >= i * CARD_OVERLAP) { touchedIdx = i; break; }
        }
        if (touchedIdx < 0) { dragInfoRef.current = null; return false; }

        const card = colCards[touchedIdx];
        if (!card?.faceUp) { dragInfoRef.current = null; return false; }

        const cards = colCards.slice(touchedIdx);
        dragInfoRef.current = {
          cards,
          fromCol: col,
          fromIdx: touchedIdx,
          originX: colLeft(col),
          originY: touchedIdx * CARD_OVERLAP - boardScrollY.current + TOOLBAR_H + TOP_ROW_H,
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
        const tc = xToTableauCol(currentX);
        setDragTargetCol(tc !== dragInfoRef.current.fromCol ? tc : null);
      },
      onPanResponderRelease: (_, g) => {
        const info = dragInfoRef.current;
        dragActiveRef.current = false;
        if (!info) return;
        const s = stateRef.current;
        const currentX = info.originX + g.dx + CARD_W / 2;
        const toCol = xToTableauCol(currentX);
        setActiveDrag(null);
        setDragTargetCol(null);
        dragInfoRef.current = null;
        if (toCol >= 0 && toCol < 7 && toCol !== info.fromCol) {
          const res = moveTableauToTableau(s, info.fromCol, info.fromIdx, toCol);
          if (res) {
            setHistory((h) => [...h.slice(-undoLimitRef.current), s]);
            setState(res);
            setSelected(null);
            Haptics.selectionAsync();
          }
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

  const wasteCard = state.waste.length > 0 ? state.waste[state.waste.length - 1] : null;
  const wasteSelected = selected === "waste";

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: "rgba(0,0,0,0.25)", height: TOOLBAR_H }]}>
        <View style={styles.stats}>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="star-outline" size={13} color={colors.accent} />
            <Text style={[styles.statVal, { color: colors.accent }]}>{state.score}</Text>
          </View>
          <View style={styles.statChip}>
            <Feather name="shuffle" size={13} color={colors.mutedForeground} />
            <Text style={[styles.statVal, { color: colors.mutedForeground }]}>{state.moves}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={history.length === 0}
            style={[styles.toolBtn, {
              backgroundColor: history.length > 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
              borderColor: history.length > 0 ? colors.primary : colors.border,
            }]}
          >
            <Feather name="rotate-ccw" size={15} color={history.length > 0 ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.toolLabel, { color: history.length > 0 ? "#fff" : colors.mutedForeground }]}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleHint}
            style={[styles.toolBtn, { backgroundColor: "rgba(201,168,76,0.18)", borderColor: colors.accent + "88" }]}
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={15} color={colors.accent} />
            <Text style={[styles.toolLabel, { color: colors.accent }]}>Hint</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNewGame}
            style={[styles.toolBtn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "#ef4444" }]}
          >
            <Feather name="refresh-cw" size={15} color="#ef4444" />
            <Text style={[styles.toolLabel, { color: "#ef4444" }]}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top row: stock + waste + foundations */}
      <View style={[styles.topRow, { backgroundColor: "rgba(0,0,0,0.2)" }]}>
        <TouchableOpacity
          onPress={handleDraw}
          style={[styles.topCard, {
            borderColor: colors.accent,
            backgroundColor: state.stock.length > 0 ? colors.cardBack : "rgba(255,255,255,0.07)",
          }]}
        >
          {state.stock.length > 0 ? (
            <>
              <MaterialCommunityIcons name="cards" size={20} color={colors.accent} />
              <Text style={[styles.topCardLabel, { color: colors.accent }]}>{state.stock.length}</Text>
            </>
          ) : (
            <>
              <Feather name="refresh-ccw" size={18} color={colors.mutedForeground} />
              <Text style={[styles.topCardLabel, { color: colors.mutedForeground }]}>Reset</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleWastePress}
          style={[styles.topCard, {
            borderColor: hintHighlight?.waste ? colors.accent : wasteSelected ? colors.accent : colors.border,
            borderWidth: hintHighlight?.waste || wasteSelected ? 2.5 : 1,
            backgroundColor: hintHighlight?.waste
              ? "rgba(201,168,76,0.2)"
              : wasteCard ? "#ffffff" : "rgba(255,255,255,0.05)",
            overflow: "hidden",
          }]}
        >
          {wasteCard ? (
            <PlayingCard card={wasteCard} width={CARD_W - 4} height={CARD_H * 0.82} selected={wasteSelected} backImage={backImage} />
          ) : (
            <Text style={[styles.emptyLabel, { color: colors.mutedForeground }]}>Waste</Text>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        {[0, 1, 2, 3].map((fi) => {
          const f = state.foundations[fi];
          const topCard = f.length > 0 ? f[f.length - 1] : null;
          const suits = ["♠", "♥", "♦", "♣"];
          return (
            <TouchableOpacity
              key={fi}
              onPress={handleFoundationPress}
              style={[styles.topCard, {
                borderColor: hintHighlight?.foundation ? colors.accent : topCard ? colors.accent : colors.accent + "55",
                borderWidth: hintHighlight?.foundation ? 2.5 : 1,
                backgroundColor: hintHighlight?.foundation
                  ? "rgba(201,168,76,0.2)"
                  : topCard ? "#ffffff" : "rgba(255,255,255,0.05)",
                overflow: "hidden",
              }]}
            >
              {topCard ? (
                <PlayingCard card={topCard} width={CARD_W - 4} height={CARD_H * 0.82} backImage={backImage} />
              ) : (
                <Text style={[styles.emptyLabel, { color: colors.accent + "88", fontSize: 20 }]}>{suits[fi]}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tableau */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { boardScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        style={styles.boardScroll}
        scrollEnabled={activeDrag === null}
      >
        <View style={styles.tableau} {...boardPR.panHandlers}>
          {state.tableau.map((col, colIdx) => {
            const isTarget = dragTargetCol === colIdx && activeDrag !== null;
            const isHintTo = hintHighlight?.toCol === colIdx && activeDrag === null;
            const colHeight = Math.max(CARD_H, col.length * CARD_OVERLAP + CARD_H - CARD_OVERLAP);
            return (
              <TouchableOpacity
                key={colIdx}
                style={[styles.tableauCol, {
                  width: CARD_W,
                  height: colHeight,
                  backgroundColor: isTarget
                    ? colors.accent + "30"
                    : isHintTo ? "rgba(201,168,76,0.18)" : "transparent",
                  borderRadius: 6,
                  borderWidth: isTarget || isHintTo ? 1.5 : 0,
                  borderColor: isTarget || isHintTo ? colors.accent : "transparent",
                  borderStyle: isTarget ? "dashed" : "solid",
                }]}
                onPress={() => col.length === 0 ? handleEmptyCol(colIdx) : undefined}
                activeOpacity={1}
              >
                {col.length === 0 && (
                  <View style={[styles.emptyCol, { borderColor: colors.accent + "44", width: CARD_W, height: CARD_H }]} />
                )}
                {col.map((card, cardIdx) => {
                  const isDragging = activeDrag?.fromCol === colIdx && cardIdx >= (activeDrag?.fromIdx ?? Infinity);
                  const isCardSelected = selected && typeof selected === "object" && selected.col === colIdx && cardIdx >= selected.idx;
                  const isHintFrom = hintHighlight?.fromCol === colIdx && cardIdx === hintHighlight.fromIdx;
                  return (
                    <View
                      key={card.id}
                      style={{
                        position: "absolute",
                        top: cardIdx * CARD_OVERLAP,
                        zIndex: cardIdx + 1,
                        opacity: isDragging ? 0.2 : 1,
                      }}
                    >
                      {isHintFrom && (
                        <View style={[StyleSheet.absoluteFill, {
                          borderRadius: 4, borderWidth: 2.5,
                          borderColor: colors.accent, backgroundColor: "rgba(201,168,76,0.18)", zIndex: 99,
                          pointerEvents: "none",
                        }]} />
                      )}
                      <TouchableOpacity
                        onPress={() => handleTableauPress(colIdx, cardIdx)}
                        activeOpacity={0.85}
                      >
                        <PlayingCard
                          card={card}
                          width={CARD_W - 1}
                          height={CARD_H}
                          selected={!isDragging && (!!isCardSelected || isHintFrom)}
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
          style={[styles.dragOverlay, {
            left: activeDrag.originX,
            top: activeDrag.originY,
            transform: dragPan.getTranslateTransform(),
          }]}
        >
          {activeDrag.cards.map((card, i) => (
            <View key={card.id} style={{ marginTop: i === 0 ? 0 : -(CARD_H - CARD_OVERLAP) }}>
              <PlayingCard card={card} width={CARD_W - 1} height={CARD_H} selected backImage={backImage} />
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  stats: { flexDirection: "row", gap: 8, alignItems: "center" },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  statVal: { fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 6 },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  toolLabel: { fontSize: 12, fontWeight: "700" },
  topRow: {
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: GUTTER,
    paddingVertical: 8,
    alignItems: "center",
  },
  topCard: {
    width: CARD_W,
    height: CARD_H * 0.82,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topCardLabel: { fontSize: 10, fontWeight: "700", marginTop: 2 },
  emptyLabel: { fontSize: 16, fontWeight: "700" },
  boardScroll: { flex: 1, backgroundColor: "transparent" },
  tableau: {
    flexDirection: "row",
    gap: GAP,
    paddingHorizontal: GUTTER,
    paddingTop: 8,
    paddingBottom: 20,
  },
  tableauCol: { position: "relative" },
  emptyCol: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 6,
  },
  dragOverlay: {
    position: "absolute",
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 20,
  },
});
