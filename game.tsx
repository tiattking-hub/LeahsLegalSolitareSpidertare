import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { GameBoard } from "@/components/GameBoard";
import { KlondikeBoard } from "@/components/KlondikeBoard";
import { LegalQuestionModal } from "@/components/LegalQuestionModal";
import { STATIC_CASES, LEGAL_FACTS, RANDOM_EVENTS, getRandomCase, type LegalCase } from "@/utils/legalCases";
import type { Difficulty, GameType } from "./game-select";
import type { CourtroomId } from "@/context/GameContext";

const COURTROOM_IMAGES: Record<CourtroomId, any> = {
  stvincent:    require("../assets/images/courtroom_stvincent.png"),
  barbados:     require("../assets/images/courtroom_barbados.png"),
  grenada:      require("../assets/images/courtroom_grenada.png"),
  bahamas:      require("../assets/images/courtroom_bahamas.png"),
  jamaica:      require("../assets/images/courtroom_jamaica.png"),
  england:      require("../assets/images/courtroom_england.png"),
  japan:        require("../assets/images/courtroom_japan.png"),
  usa:          require("../assets/images/courtroom_usa.png"),
  stkitts:      require("../assets/images/courtroom_stkitts.png"),
  houseofLords: require("../assets/images/courtroom_houseofLords.png"),
  guyana:       require("../assets/images/courtroom_guyana.png"),
  australia:    require("../assets/images/courtroom_australia.png"),
};

const COURTROOM_DISPLAY_NAMES: Record<string, string> = {
  stvincent:    "St. Vincent",
  barbados:     "Barbados",
  grenada:      "Grenada",
  bahamas:      "The Bahamas",
  jamaica:      "Jamaica",
  england:      "England",
  japan:        "Japan",
  usa:          "United States",
  stkitts:      "St. Kitts & Nevis",
  houseofLords: "House of Lords",
  guyana:       "Guyana",
  australia:    "Australia",
};

export default function GameScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, addCase, addXP, updateStreak, markCaseSeen } = useGame();
  const params = useLocalSearchParams<{ gameType?: string; difficulty?: string }>();

  const gameType = (params.gameType ?? "spider") as GameType;
  const difficulty = (params.difficulty ?? "easy") as Difficulty;

  // Board entrance animation — quick fade+scale, no blocking overlay
  const boardOpacity = useRef(new Animated.Value(0)).current;
  const boardScale   = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(boardOpacity, { toValue: 1, duration: 280, useNativeDriver: false }),
      Animated.spring(boardScale, { toValue: 1, friction: 9, tension: 80, useNativeDriver: false }),
    ]).start();
  }, []);

  // Win screen animation refs
  const winIconScale  = useRef(new Animated.Value(0)).current;
  const winTitleOp    = useRef(new Animated.Value(0)).current;
  const winCardOp     = useRef(new Animated.Value(0)).current;
  const winBtnsOp     = useRef(new Animated.Value(0)).current;

  const triggerWinAnimation = useCallback(() => {
    winIconScale.setValue(0);
    winTitleOp.setValue(0);
    winCardOp.setValue(0);
    winBtnsOp.setValue(0);
    Animated.stagger(120, [
      Animated.spring(winIconScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: false }),
      Animated.timing(winTitleOp, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.timing(winCardOp, { toValue: 1, duration: 350, useNativeDriver: false }),
      Animated.timing(winBtnsOp, { toValue: 1, duration: 300, useNativeDriver: false }),
    ]).start();
  }, []);

  const [credibility, setCredibility] = useState(100);
  const [questionVisible, setQuestionVisible] = useState(false);
  const [currentCase, setCurrentCase] = useState<LegalCase | null>(null);
  const [randomEvent, setRandomEvent] = useState<typeof RANDOM_EVENTS[0] | null>(null);
  const [gameFinished, setGameFinished] = useState<"won" | "lost" | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [funFact, setFunFact] = useState<string>("");

  const movesSinceQuestion = useRef(0);
  const questionsShown = useRef(0);
  const lastQuestionTime = useRef(0);
  const seenInSession = useRef<string[]>([]);

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const getNextCase = useCallback((): LegalCase => {
    const exclude = [...seenInSession.current, ...profile.seenCaseIds].slice(-30);
    const nextCase = getRandomCase(exclude.length < STATIC_CASES.length - 5 ? exclude : []);
    seenInSession.current = [...seenInSession.current, nextCase.id].slice(-20);
    return nextCase;
  }, [profile.seenCaseIds]);

  const showRandomEvent = useCallback(() => {
    if (Math.random() < 0.2) {
      const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      setRandomEvent(event);
      setTimeout(() => setRandomEvent(null), 3500);
    }
  }, []);

  const handleSuitComplete = useCallback(() => {
    const now = Date.now();
    const timeSinceLastQ = now - lastQuestionTime.current;
    if (
      questionsShown.current < 5 &&
      timeSinceLastQ > 45000 &&
      movesSinceQuestion.current >= 8 &&
      Math.random() < 0.75
    ) {
      const nextCase = getNextCase();
      setCurrentCase(nextCase);
      setQuestionVisible(true);
      lastQuestionTime.current = now;
      movesSinceQuestion.current = 0;
      questionsShown.current += 1;
      showRandomEvent();
    } else {
      addXP(10);
    }
  }, [getNextCase, addXP, showRandomEvent]);

  const handleQuestionCorrect = useCallback(() => {
    setQuestionVisible(false);
    if (currentCase) markCaseSeen(currentCase.id);
    addXP(35);
    setCredibility((c) => Math.min(100, c + 10));
  }, [addXP, markCaseSeen, currentCase]);

  const handleQuestionWrong = useCallback(() => {
    setQuestionVisible(false);
    if (currentCase) markCaseSeen(currentCase.id);
    setCredibility((c) => Math.max(0, c - 15));
  }, [markCaseSeen, currentCase]);

  const handleGameWon = useCallback((score: number) => {
    setFinalScore(score);
    setFunFact(LEGAL_FACTS[Math.floor(Math.random() * LEGAL_FACTS.length)]);
    setGameFinished("won");
    triggerWinAnimation();
    addXP(150 + score);
    updateStreak();
    const newCase = STATIC_CASES[Math.floor(Math.random() * STATIC_CASES.length)];
    addCase({
      id: newCase.id + Date.now(),
      title: newCase.title,
      outcome: "Case Won",
      principle: newCase.principle,
      category: newCase.category,
      difficulty: newCase.difficulty,
      rarity: newCase.rarity,
      date: new Date().toLocaleDateString(),
      facts: newCase.facts,
    });
  }, [addXP, updateStreak, addCase, triggerWinAnimation]);

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setFunFact(LEGAL_FACTS[Math.floor(Math.random() * LEGAL_FACTS.length)]);
    setGameFinished("lost");
    triggerWinAnimation();
    addXP(20);
  }, [addXP, triggerWinAnimation]);

  const diffLabel: Record<Difficulty, string> = {
    super_easy: "Super Easy",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    super_hard: "Super Hard",
  };

  const gameName = gameType === "klondike" ? "Classic Solitaire" : "Spider Solitaire";
  const courtroomDisplay = COURTROOM_DISPLAY_NAMES[profile.selectedCourtroom] ?? profile.selectedCourtroom;

  const credColor = credibility > 60 ? "#22c55e" : credibility > 30 ? colors.accent : "#ef4444";

  if (gameFinished) {
    const isWon = gameFinished === "won";
    const accent = isWon ? colors.accent : "#ef4444";
    return (
      <ImageBackground source={courtroomBg} style={styles.root} resizeMode="cover">
        <LinearGradient
          colors={["rgba(0,0,0,0.88)", "rgba(4,16,9,0.96)"]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView contentContainerStyle={[styles.endScreen, { paddingTop: topPad + 24 }]}>

          {/* Animated icon ring */}
          <Animated.View style={{ transform: [{ scale: winIconScale }] }}>
            <View style={[styles.endIconRing, {
              borderColor: accent,
              backgroundColor: accent + "18",
            }]}>
              <MaterialCommunityIcons
                name={isWon ? "gavel" : "scale-unbalanced"}
                size={52}
                color={accent}
              />
            </View>
          </Animated.View>

          {/* Animated title + score */}
          <Animated.View style={{ opacity: winTitleOp, alignItems: "center", gap: 6 }}>
            <Text style={[styles.endTitle, { color: accent, fontFamily: "Georgia" }]}>
              {isWon ? "Case Closed!" : "Insufficient Evidence"}
            </Text>
            <Text style={[styles.endScore, { color: "#ffffff" }]}>Score: {finalScore}</Text>
            <Text style={[styles.endXP, { color: colors.accent }]}>
              +{isWon ? 150 + finalScore : 20} XP earned
            </Text>
          </Animated.View>

          {/* Animated fact box */}
          <Animated.View style={[styles.factBox, { opacity: winCardOp, backgroundColor: "rgba(201,168,76,0.12)", borderColor: colors.accent + "66" }]}>
            <Text style={[styles.factLabel, { color: colors.accent }]}>DID YOU KNOW?</Text>
            <Text style={[styles.factText, { color: "#e0e0e0" }]}>{funFact}</Text>
          </Animated.View>

          {/* Animated buttons */}
          <Animated.View style={[styles.endBtns, { opacity: winBtnsOp }]}>
            <TouchableOpacity
              style={[styles.endBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                setGameFinished(null);
                movesSinceQuestion.current = 0;
                questionsShown.current = 0;
                lastQuestionTime.current = 0;
                seenInSession.current = [];
              }}
            >
              <Feather name="refresh-cw" size={18} color="#000" />
              <Text style={[styles.endBtnText, { color: "#000" }]}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endBtn, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.18)", borderWidth: 1 }]}
              onPress={() => router.back()}
            >
              <Feather name="home" size={18} color="#fff" />
              <Text style={[styles.endBtnText, { color: "#fff" }]}>Home</Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    /* Single full-screen courtroom image — covers header AND board with no seam */
    <ImageBackground source={courtroomBg} style={styles.root} resizeMode="cover">

      {/* Lighter overlay — lets the courtroom atmosphere show through clearly */}
      <LinearGradient
        colors={[
          "rgba(2,8,4,0.38)",
          "rgba(4,12,8,0.22)",
          "rgba(4,12,8,0.20)",
          "rgba(2,8,4,0.34)",
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header bar ── floats over the image, glassy */}
      <View style={[styles.headerWrap, { paddingTop: topPad }]}>
        {/* thin gold top border */}
        <View style={[styles.goldLine, { backgroundColor: colors.accent }]} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.accent} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: "#ffffff" }]}>{gameName}</Text>
            <Text style={[styles.headerSub, { color: colors.accent }]}>
              {diffLabel[difficulty]} · {courtroomDisplay}
            </Text>
          </View>

          <View style={[styles.credBadge, { borderColor: credColor, backgroundColor: "rgba(0,0,0,0.45)" }]}>
            <MaterialCommunityIcons name="gavel" size={12} color={credColor} />
            <Text style={[styles.credText, { color: credColor }]}>{credibility}</Text>
          </View>
        </View>

        {/* thin gold bottom border */}
        <View style={[styles.goldLine, { backgroundColor: colors.accent + "55" }]} />
      </View>

      {/* ── Random event toast ── */}
      {randomEvent && (
        <View style={[styles.eventBanner, { backgroundColor: colors.accent }]}>
          <Feather name="zap" size={14} color="#000" />
          <Text style={styles.eventTitle}>{randomEvent.title}</Text>
          <Text style={styles.eventDesc} numberOfLines={1}>{randomEvent.description}</Text>
        </View>
      )}

      {/* ── Game board ── transparent so the courtroom image shows through fully */}
      <Animated.View style={[styles.boardWrap, { opacity: boardOpacity, transform: [{ scale: boardScale }] }]}>
        {gameType === "klondike" ? (
          <KlondikeBoard
            difficulty={difficulty}
            onGameWon={handleGameWon}
            onGameOver={handleGameOver}
            onSuitComplete={handleSuitComplete}
          />
        ) : (
          <GameBoard
            difficulty={difficulty}
            onSuitComplete={handleSuitComplete}
            onGameWon={handleGameWon}
            onGameOver={handleGameOver}
            credibilityScore={credibility}
            setCredibilityScore={setCredibility}
            onHintRequest={() => {}}
            hintUnlocked={false}
            onHintUsed={() => {}}
          />
        )}
      </Animated.View>

      <LegalQuestionModal
        visible={questionVisible}
        legalCase={currentCase}
        onCorrect={handleQuestionCorrect}
        onWrong={handleQuestionWrong}
        onClose={() => setQuestionVisible(false)}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  headerWrap: {
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  goldLine: { height: 1.5, width: "100%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  headerSub: { fontSize: 11, marginTop: 1, fontWeight: "600" },
  credBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  credText: { fontSize: 13, fontWeight: "700" },

  eventBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 8,
    marginTop: 4,
    padding: 8,
    borderRadius: 8,
  },
  eventTitle: { fontSize: 12, fontWeight: "700", color: "#000" },
  eventDesc: { fontSize: 11, flex: 1, color: "#00000099" },

  boardWrap: { flex: 1 },

  endScreen: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
    gap: 16,
  },
  endIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  endTitle: { fontSize: 28, fontWeight: "700", letterSpacing: 0.8, textAlign: "center" },
  endScore: { fontSize: 20, fontWeight: "600" },
  endXP: { fontSize: 15, fontWeight: "700" },
  factBox: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 6, width: "100%" },
  factLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  factText: { fontSize: 13, lineHeight: 21, fontStyle: "italic" },
  endBtns: { flexDirection: "row", gap: 12, width: "100%" },
  endBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 15,
    borderRadius: 12,
  },
  endBtnText: { fontSize: 15, fontWeight: "700" },
});
