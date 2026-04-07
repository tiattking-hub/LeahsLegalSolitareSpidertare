import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { STATIC_CASES, type LegalCase } from "@/utils/legalCases";
import type { CourtroomId } from "@/context/GameContext";

const COURTROOM_IMAGES: Record<CourtroomId, any> = {
  stvincent: require("../assets/images/courtroom_stvincent.png"),
  barbados: require("../assets/images/courtroom_barbados.png"),
  grenada: require("../assets/images/courtroom_grenada.png"),
  bahamas: require("../assets/images/courtroom_bahamas.png"),
  jamaica: require("../assets/images/courtroom_jamaica.png"),
  england: require("../assets/images/courtroom_england.png"),
  japan: require("../assets/images/courtroom_japan.png"),
  usa: require("../assets/images/courtroom_usa.png"),
  stkitts: require("../assets/images/courtroom_stkitts.png"),
  houseofLords: require("../assets/images/courtroom_houseofLords.png"),
  australia:    require("../assets/images/courtroom_australia.png"),
  guyana: require("../assets/images/courtroom_guyana.png"),
};

const TIMER_SECONDS = 30;
const CATEGORIES = ["all", "criminal", "contract", "tort", "constitutional"] as const;
type Category = typeof CATEGORIES[number];

const CAT_COLORS: Record<string, string> = {
  criminal: "#ef4444", contract: "#3b82f6", tort: "#f59e0b", constitutional: "#10b981",
};
const RARITY_COLORS = {
  common: { badge: "#6b7280", bg: "rgba(107,114,128,0.12)" },
  rare: { badge: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  legendary: { badge: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

type Phase = "setup" | "custom-pick" | "playing" | "done";

export default function FlashcardsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, addXP } = useGame();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;

  // Setup state
  const [phase, setPhase] = useState<Phase>("setup");
  const [deckSize, setDeckSize] = useState<10 | 20 | 30 | 55>(20);
  const [filterCat, setFilterCat] = useState<Category>("all");
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Playing state
  const [deck, setDeck] = useState<LegalCase[]>([]);
  const [deckIdx, setDeckIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredCorrect, setAnsweredCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(true);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const timerBarAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const frontInterp = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
  const backInterp = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerAnimRef.current) timerAnimRef.current.stop();
  };

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(TIMER_SECONDS);
    timerBarAnim.setValue(1);
    timerAnimRef.current = Animated.timing(timerBarAnim, {
      toValue: 0, duration: TIMER_SECONDS * 1000, useNativeDriver: false,
    });
    timerAnimRef.current.start();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          doFlip();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const doFlip = () => {
    setFlipped(true);
    Animated.timing(flipAnim, { toValue: 180, duration: 350, useNativeDriver: true }).start();
    setTimerActive(false);
    clearTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleFlip = () => {
    if (flipped) return;
    clearTimer();
    setTimerActive(false);
    doFlip();
  };

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null || !deck[deckIdx]) return;
    const isCorrect = idx === deck[deckIdx].correctIndex;
    setSelectedAnswer(idx);
    setAnsweredCorrect(isCorrect);
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = (wasCorrect: boolean) => {
    addXP(wasCorrect ? 15 : 5);
    if (wasCorrect) setCorrect((c) => c + 1);
    const next = deckIdx + 1;
    if (next >= deck.length) {
      setPhase("done");
      return;
    }
    setDeckIdx(next);
    setFlipped(false);
    flipAnim.setValue(0);
    setSelectedAnswer(null);
    setAnsweredCorrect(null);
    setTimerActive(true);
    setTimeout(() => startTimer(), 300);
  };

  const buildDeck = useCallback((ids?: string[]) => {
    let source = ids
      ? STATIC_CASES.filter((c) => ids.includes(c.id))
      : filterCat === "all"
      ? STATIC_CASES
      : STATIC_CASES.filter((c) => c.category === filterCat);
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    return ids ? shuffled : shuffled.slice(0, deckSize);
  }, [filterCat, deckSize]);

  const startSession = (custom?: boolean) => {
    const d = custom && customIds.length > 0 ? buildDeck(customIds) : buildDeck();
    setDeck(d);
    setDeckIdx(0);
    setCorrect(0);
    setFlipped(false);
    flipAnim.setValue(0);
    setSelectedAnswer(null);
    setAnsweredCorrect(null);
    setTimerActive(true);
    setPhase("playing");
    setTimeout(() => startTimer(), 400);
  };

  useEffect(() => { return () => clearTimer(); }, []);

  const current = deck[deckIdx];
  const catColor = current ? (CAT_COLORS[current.category] ?? colors.accent) : colors.accent;
  const rarityStyle = current ? RARITY_COLORS[current.rarity] : RARITY_COLORS.common;

  // ─── SETUP SCREEN ─────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <View style={styles.container}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.accent} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="cards" size={22} color={colors.accent} />
          <Text style={[styles.headerTitle, { color: colors.accent }]}>Flashcards</Text>
        </View>
        <ScrollView contentContainerStyle={styles.setupContent}>
          <MaterialCommunityIcons name="layers-triple" size={52} color={colors.accent} />
          <Text style={[styles.setupTitle, { color: "#ffffff" }]}>Build Your Study Deck</Text>
          <Text style={[styles.setupSub, { color: colors.mutedForeground }]}>
            Choose how many cards to study, filter by area of law, or build a custom deck
          </Text>

          {/* Deck size */}
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>DECK SIZE</Text>
          <View style={styles.optionRow}>
            {([10, 20, 30, 55] as const).map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.optionBtn, { borderColor: deckSize === n ? colors.accent : colors.border, backgroundColor: deckSize === n ? colors.accent + "22" : "transparent" }]}
                onPress={() => { setDeckSize(n); setIsCustomMode(false); }}
              >
                <Text style={[styles.optionBtnNum, { color: deckSize === n ? colors.accent : "#ffffff" }]}>{n === 55 ? "All" : n}</Text>
                <Text style={[styles.optionBtnLbl, { color: colors.mutedForeground }]}>{n === 55 ? "55" : n === 10 ? "Quick" : n === 20 ? "Standard" : "Full"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category filter */}
          <Text style={[styles.sectionLabel, { color: colors.accent }]}>AREA OF LAW</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((cat) => {
              const active = filterCat === cat;
              const col = cat === "all" ? colors.accent : CAT_COLORS[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, { borderColor: active ? col : colors.border, backgroundColor: active ? col + "22" : "transparent" }]}
                  onPress={() => setFilterCat(cat)}
                >
                  <Text style={[styles.catBtnText, { color: active ? col : colors.mutedForeground }]}>
                    {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Start button */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.accent }]}
            onPress={() => startSession(false)}
          >
            <MaterialCommunityIcons name="play" size={20} color="#000" />
            <Text style={[styles.startBtnText, { color: "#000" }]}>Start Session</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          {/* Custom deck */}
          <TouchableOpacity
            style={[styles.customBtn, { borderColor: colors.accent, backgroundColor: "rgba(201,168,76,0.08)" }]}
            onPress={() => setPhase("custom-pick")}
          >
            <MaterialCommunityIcons name="playlist-edit" size={22} color={colors.accent} />
            <View style={styles.customBtnInfo}>
              <Text style={[styles.customBtnTitle, { color: colors.accent }]}>Build Custom Deck</Text>
              <Text style={[styles.customBtnSub, { color: colors.mutedForeground }]}>
                Hand-pick your favourite cases from all 55
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {customIds.length > 0 && (
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: "#7c3aed", marginTop: 0 }]}
              onPress={() => startSession(true)}
            >
              <MaterialCommunityIcons name="play-circle" size={20} color="#ffffff" />
              <Text style={[styles.startBtnText, { color: "#ffffff" }]}>
                Play Custom Deck ({customIds.length} cards)
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── CUSTOM PICK SCREEN ────────────────────────────────────────────────────
  if (phase === "custom-pick") {
    return (
      <View style={styles.container}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.88)" }]} />
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => setPhase("setup")} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.accent }]}>Build Your Deck</Text>
          <Text style={[styles.customCount, { color: customIds.length > 0 ? "#22c55e" : colors.mutedForeground }]}>
            {customIds.length} selected
          </Text>
        </View>

        <FlatList
          data={STATIC_CASES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const selected = customIds.includes(item.id);
            const col = CAT_COLORS[item.category] ?? colors.accent;
            return (
              <TouchableOpacity
                style={[styles.pickItem, {
                  backgroundColor: selected ? col + "18" : "rgba(0,0,0,0.55)",
                  borderColor: selected ? col : "rgba(255,255,255,0.1)",
                }]}
                onPress={() => {
                  setCustomIds((ids) =>
                    ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]
                  );
                  Haptics.selectionAsync();
                }}
              >
                <View style={[styles.pickCheckbox, { borderColor: selected ? col : colors.border, backgroundColor: selected ? col : "transparent" }]}>
                  {selected && <Feather name="check" size={12} color="#000" />}
                </View>
                <View style={styles.pickInfo}>
                  <Text style={[styles.pickTitle, { color: selected ? col : "#ffffff" }]} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.pickMeta, { color: colors.mutedForeground }]}>
                    {item.category} · {item.rarity}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {customIds.length > 0 && (
          <View style={[styles.customFooter, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.accent, flex: 1, marginTop: 0 }]}
              onPress={() => { setIsCustomMode(true); startSession(true); }}
            >
              <MaterialCommunityIcons name="play" size={18} color="#000" />
              <Text style={[styles.startBtnText, { color: "#000" }]}>
                Study {customIds.length} Selected Cards
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ─── DONE SCREEN ──────────────────────────────────────────────────────────
  if (phase === "done") {
    const xpEarned = correct * 15 + deck.length * 5;
    return (
      <View style={styles.container}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)" }]} />
        <View style={[styles.doneScreen, { paddingTop: topPad + 32 }]}>
          <MaterialCommunityIcons name="check-decagram" size={72} color={colors.accent} />
          <Text style={[styles.doneTitle, { color: colors.accent }]}>Session Complete!</Text>
          <Text style={[styles.doneSub, { color: "#ffffff" }]}>{correct} / {deck.length} correct</Text>
          <View style={styles.doneBar}>
            <View style={[styles.doneBarFill, { width: `${Math.round((correct / deck.length) * 100)}%`, backgroundColor: correct / deck.length >= 0.7 ? "#22c55e" : colors.accent }]} />
          </View>
          <Text style={[styles.doneXP, { color: colors.accent }]}>+{xpEarned} XP earned</Text>
          <View style={styles.doneBtns}>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.accent }]} onPress={() => setPhase("setup")}>
              <Feather name="refresh-cw" size={18} color="#000" />
              <Text style={[styles.doneBtnText, { color: "#000" }]}>New Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: colors.border, borderWidth: 1 }]} onPress={() => router.back()}>
              <Feather name="home" size={18} color="#ffffff" />
              <Text style={[styles.doneBtnText, { color: "#ffffff" }]}>Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── PLAYING SCREEN ───────────────────────────────────────────────────────
  if (!current) return null;

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.80)" }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => { clearTimer(); setPhase("setup"); }} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.accent }]}>Flashcards</Text>
          <Text style={[styles.headerProg, { color: colors.mutedForeground }]}>
            {deckIdx + 1} / {deck.length} · {correct} correct
          </Text>
        </View>
        <View style={[styles.timerCircle, { borderColor: timeLeft > 10 ? colors.accent : "#ef4444" }]}>
          <Text style={[styles.timerNum, { color: timeLeft > 10 ? colors.accent : "#ef4444" }]}>{timeLeft}</Text>
        </View>
      </View>

      <View style={[styles.timerBar, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
        <Animated.View style={[styles.timerFill, {
          backgroundColor: timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? colors.accent : "#ef4444",
          width: timerBarAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }]} />
      </View>

      <View style={styles.progressDots}>
        {deck.slice(Math.max(0, deckIdx - 3), deckIdx + 8).map((_, i) => {
          const abs = Math.max(0, deckIdx - 3) + i;
          return (
            <View key={abs} style={[styles.dot, {
              backgroundColor: abs < deckIdx ? "#22c55e" : abs === deckIdx ? colors.accent : "rgba(255,255,255,0.18)",
              width: abs === deckIdx ? 16 : 8,
            }]} />
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.playContent}>
        <TouchableOpacity onPress={handleFlip} activeOpacity={flipped ? 1 : 0.95} style={styles.cardOuter} disabled={flipped}>
          {/* Front */}
          <Animated.View style={[
            styles.card,
            { backgroundColor: "rgba(5,15,10,0.90)", borderColor: colors.accent + "44" },
            { backfaceVisibility: "hidden", transform: [{ rotateY: frontInterp }] },
          ]}>
            <View style={styles.cardBadgeRow}>
              <View style={[styles.catBadge, { backgroundColor: catColor + "22" }]}>
                <Text style={[styles.catBadgeText, { color: catColor }]}>{current.category.toUpperCase()}</Text>
              </View>
              <View style={[styles.rarityBadge, { borderColor: rarityStyle.badge }]}>
                <Text style={[styles.rarityBadgeText, { color: rarityStyle.badge }]}>{current.rarity.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={[styles.cardTitle, { color: colors.accent }]}>{current.title}</Text>
            <Text style={[styles.cardFacts, { color: "#dddddd" }]}>{current.facts}</Text>
            <View style={styles.flipHintRow}>
              <MaterialCommunityIcons name="gesture-tap" size={18} color={colors.accent + "88"} />
              <Text style={[styles.flipHint, { color: colors.mutedForeground }]}>
                Tap to flip {timerActive ? `· ${timeLeft}s` : ""}
              </Text>
            </View>
          </Animated.View>

          {/* Back */}
          <Animated.View style={[
            styles.card,
            styles.cardBack,
            { backgroundColor: "rgba(5,20,10,0.95)", borderColor: colors.primary + "55" },
            { backfaceVisibility: "hidden", transform: [{ rotateY: backInterp }] },
          ]}>
            <View style={[styles.qBox, { borderColor: colors.primary, backgroundColor: colors.primary + "12" }]}>
              <Text style={[styles.qLabel, { color: colors.primary }]}>QUESTION</Text>
              <Text style={[styles.qText, { color: "#ffffff" }]}>{current.question}</Text>
            </View>
            {current.options.map((opt, idx) => {
              let bg = "rgba(255,255,255,0.06)";
              let border = "rgba(255,255,255,0.15)";
              let tc = "#cccccc";
              if (selectedAnswer !== null) {
                if (idx === current.correctIndex) { bg = "#16653433"; border = "#22c55e"; tc = "#22c55e"; }
                else if (idx === selectedAnswer) { bg = "#ef444422"; border = "#ef4444"; tc = "#ef4444"; }
                else { bg = "transparent"; border = "rgba(255,255,255,0.07)"; tc = "#555"; }
              }
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => handleAnswer(idx)}
                  disabled={selectedAnswer !== null}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optLetter, { borderColor: border }]}>
                    <Text style={[styles.optLetterText, { color: tc }]}>{String.fromCharCode(65 + idx)}</Text>
                  </View>
                  <Text style={[styles.optText, { color: tc }]}>{opt}</Text>
                  {selectedAnswer !== null && idx === current.correctIndex && <Feather name="check-circle" size={15} color="#22c55e" />}
                </TouchableOpacity>
              );
            })}
            {selectedAnswer !== null && (
              <>
                <View style={[styles.explainBox, { borderColor: answeredCorrect ? "#22c55e" : "#ef4444" }]}>
                  <Text style={[styles.explainResult, { color: answeredCorrect ? "#22c55e" : "#ef4444" }]}>
                    {answeredCorrect ? "✓ Correct!" : "✗ Not quite"}
                  </Text>
                  <Text style={[styles.explainText, { color: "#cccccc" }]}>{current.explanation}</Text>
                  <View style={[styles.principleLine, { borderColor: colors.accent }]}>
                    <Text style={[styles.principleText, { color: colors.accent }]}>{current.principle}</Text>
                  </View>
                </View>
                <View style={styles.nextBtns}>
                  <TouchableOpacity style={[styles.nextBtn, { backgroundColor: "#22c55e" }]} onPress={() => handleNext(true)}>
                    <Feather name="check" size={16} color="#000" />
                    <Text style={[styles.nextBtnText, { color: "#000" }]}>Got it</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.nextBtn, { backgroundColor: "#ef444418", borderColor: "#ef4444", borderWidth: 1 }]} onPress={() => handleNext(false)}>
                    <Feather name="refresh-cw" size={16} color="#ef4444" />
                    <Text style={[styles.nextBtnText, { color: "#ef4444" }]}>Again</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Animated.View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  backBtn: { padding: 6 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerProg: { fontSize: 12, marginTop: 1 },
  customCount: { fontSize: 14, fontWeight: "700" },
  timerCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  timerNum: { fontSize: 16, fontWeight: "700" },
  timerBar: { marginHorizontal: 16, height: 5, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  timerFill: { height: "100%", borderRadius: 3 },
  progressDots: { flexDirection: "row", gap: 5, paddingHorizontal: 16, marginBottom: 8, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  playContent: { padding: 14, paddingBottom: 40 },
  cardOuter: { height: 500 },
  card: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 18, borderWidth: 1, padding: 18, gap: 10 },
  cardBack: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardBadgeRow: { flexDirection: "row", gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  catBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  rarityBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  rarityBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardFacts: { fontSize: 13, lineHeight: 21, flex: 1 },
  flipHintRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  flipHint: { fontSize: 12 },
  qBox: { borderWidth: 1, borderRadius: 9, padding: 11, gap: 4 },
  qLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  qText: { fontSize: 14, fontWeight: "600" },
  option: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 8, borderWidth: 1.5, gap: 8 },
  optLetter: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  optLetterText: { fontSize: 12, fontWeight: "700" },
  optText: { flex: 1, fontSize: 13 },
  explainBox: { borderLeftWidth: 3, paddingLeft: 10, gap: 5 },
  explainResult: { fontSize: 14, fontWeight: "700" },
  explainText: { fontSize: 12, lineHeight: 19 },
  principleLine: { borderLeftWidth: 2, paddingLeft: 7 },
  principleText: { fontSize: 11, fontStyle: "italic", fontWeight: "600" },
  nextBtns: { flexDirection: "row", gap: 10 },
  nextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 10 },
  nextBtnText: { fontSize: 14, fontWeight: "700" },
  // Setup
  setupContent: { padding: 22, alignItems: "center", gap: 16, paddingBottom: 50 },
  setupTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  setupSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, alignSelf: "flex-start" },
  optionRow: { flexDirection: "row", gap: 10, width: "100%" },
  optionBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 12, alignItems: "center", gap: 3 },
  optionBtnNum: { fontSize: 20, fontWeight: "700" },
  optionBtnLbl: { fontSize: 10 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%" },
  catBtn: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  catBtnText: { fontSize: 13, fontWeight: "600" },
  startBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, padding: 16, borderRadius: 14, marginTop: 4,
  },
  startBtnText: { fontSize: 16, fontWeight: "700" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  customBtn: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  customBtnInfo: { flex: 1 },
  customBtnTitle: { fontSize: 16, fontWeight: "700" },
  customBtnSub: { fontSize: 12, marginTop: 2 },
  // Custom pick
  pickItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  pickCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  pickInfo: { flex: 1 },
  pickTitle: { fontSize: 14, fontWeight: "700" },
  pickMeta: { fontSize: 11, marginTop: 2 },
  customFooter: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, flexDirection: "row", backgroundColor: "rgba(0,0,0,0.9)" },
  // Done
  doneScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  doneTitle: { fontSize: 26, fontWeight: "700" },
  doneSub: { fontSize: 18, fontWeight: "600", color: "#ffffff" },
  doneBar: { width: "100%", height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  doneBarFill: { height: "100%", borderRadius: 5 },
  doneXP: { fontSize: 16, fontWeight: "700" },
  doneBtns: { flexDirection: "row", gap: 12, width: "100%" },
  doneBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  doneBtnText: { fontSize: 16, fontWeight: "700" },
});
