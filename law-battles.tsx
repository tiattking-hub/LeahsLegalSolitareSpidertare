import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  Platform,
  ScrollView,
  Share,
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
import { getRandomCase, type LegalCase } from "@/utils/legalCases";
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

const TOTAL_QUESTIONS = 10;
const TIME_PER_QUESTION = 25;

const OPPONENTS = [
  { name: "The AI Barrister", icon: "robot", color: "#7c3aed", speed: "fast" as const, desc: "Lightning Fast — Hard" },
  { name: "Counsellor Carter", icon: "briefcase-account", color: "#ef4444", speed: "medium" as const, desc: "Quick — Medium" },
  { name: "Professor Mwangi", icon: "school", color: "#3b82f6", speed: "slow" as const, desc: "Methodical — Easy" },
  { name: "Lord Pemberton KC", icon: "bank", color: "#f59e0b", speed: "medium" as const, desc: "Quick — Medium" },
];

type Speed = "fast" | "medium" | "slow";
type Phase = "intro" | "playing" | "results";

function getOpponentAnswerTime(speed: Speed): number {
  if (speed === "fast") return Math.random() * 8 + 5;
  if (speed === "medium") return Math.random() * 12 + 9;
  return Math.random() * 18 + 14;
}

export default function LawBattlesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, addXP } = useGame();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;

  const [phase, setPhase] = useState<Phase>("intro");
  const [selectedOpponent, setSelectedOpponent] = useState(OPPONENTS[0]);
  const [questions, setQuestions] = useState<LegalCase[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [opponentCorrect, setOpponentCorrect] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultHistory, setResultHistory] = useState<Array<{ player: boolean; opponent: boolean }>>([]);
  const [inviteShared, setInviteShared] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const opponentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barAnim = useRef(new Animated.Value(1)).current;
  const oppCorrectRef = useRef(false);
  const oppAnsweredRef = useRef(false);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
  };

  const buildQuestions = useCallback(() => {
    const seen: string[] = [];
    const qs: LegalCase[] = [];
    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const q = getRandomCase(seen);
      qs.push(q);
      seen.push(q.id);
    }
    return qs;
  }, []);

  const advanceQuestion = useCallback((qIdx: number) => {
    const next = qIdx + 1;
    if (next >= TOTAL_QUESTIONS) {
      setPhase("results");
      return;
    }
    setCurrentQ(next);
    setTimeout(() => startQuestion(next), 300);
  }, []);

  const startQuestion = useCallback((qIdx: number) => {
    setSelectedAnswer(null);
    setOpponentAnswered(false);
    setOpponentCorrect(false);
    setShowResult(false);
    oppAnsweredRef.current = false;
    oppCorrectRef.current = false;
    setTimeLeft(TIME_PER_QUESTION);

    barAnim.setValue(1);
    Animated.timing(barAnim, {
      toValue: 0, duration: TIME_PER_QUESTION * 1000, useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimers();
          // Time's up
          if (!oppAnsweredRef.current) {
            oppAnsweredRef.current = true;
            oppCorrectRef.current = true;
            setOpponentAnswered(true);
            setOpponentCorrect(true);
            setOpponentScore((s) => s + 1);
          }
          setResultHistory((h) => [...h, { player: false, opponent: true }]);
          setShowResult(true);
          setTimeout(() => advanceQuestion(qIdx), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    const opTime = getOpponentAnswerTime(selectedOpponent.speed);
    opponentTimerRef.current = setTimeout(() => {
      if (!oppAnsweredRef.current) {
        const isCorrect = Math.random() < 0.7;
        oppAnsweredRef.current = true;
        oppCorrectRef.current = isCorrect;
        setOpponentAnswered(true);
        setOpponentCorrect(isCorrect);
        if (isCorrect) setOpponentScore((s) => s + 1);
      }
    }, opTime * 1000);
  }, [selectedOpponent, advanceQuestion, barAnim]);

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null || showResult) return;
    clearTimers();
    setSelectedAnswer(idx);

    const q = questions[currentQ];
    const isCorrect = idx === q.correctIndex;
    if (isCorrect) {
      setPlayerScore((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    if (!oppAnsweredRef.current) {
      const oppCorrect = Math.random() < 0.55;
      oppAnsweredRef.current = true;
      oppCorrectRef.current = oppCorrect;
      setOpponentAnswered(true);
      setOpponentCorrect(oppCorrect);
      if (oppCorrect) setOpponentScore((s) => s + 1);
    }

    setResultHistory((h) => [...h, { player: isCorrect, opponent: oppCorrectRef.current }]);
    setShowResult(true);
    setTimeout(() => advanceQuestion(currentQ), 1800);
  };

  const startBattle = (opponent: typeof OPPONENTS[0]) => {
    setSelectedOpponent(opponent);
    const qs = buildQuestions();
    setQuestions(qs);
    setCurrentQ(0);
    setPlayerScore(0);
    setOpponentScore(0);
    setResultHistory([]);
    setPhase("playing");
    setTimeout(() => startQuestion(0), 500);
  };

  const handleInviteFriend = async () => {
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const playerName = profile.name || "A fellow lawyer";
    const message = `⚖️ ${playerName} challenges you to a Law Battle!\n\n` +
      `Test your legal knowledge in Leah's Legal Spider Solitaire — 10 quick-fire questions, 25 seconds each.\n\n` +
      `Game Code: ${gameCode}\n\n` +
      `Download Leah's Legal Spider Solitaire and enter this code to battle me directly!`;
    try {
      await Share.share({ message, title: "Law Battle Challenge!" });
      setInviteShared(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setInviteShared(false), 3000);
    } catch (_) {}
  };

  useEffect(() => {
    if (phase === "results") {
      clearTimers();
      const won = playerScore > opponentScore;
      addXP(won ? playerScore * 40 + 50 : playerScore * 20 + 10);
    }
    return () => clearTimers();
  }, [phase]);

  const q = questions[currentQ];
  const catColors: Record<string, string> = {
    criminal: "#ef4444", contract: "#3b82f6", tort: "#f59e0b", constitutional: "#10b981",
  };

  // ─── INTRO ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <View style={styles.container}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.83)" }]} />
        <View style={[styles.header, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.accent} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="sword-cross" size={22} color={colors.accent} />
          <Text style={[styles.headerTitle, { color: colors.accent }]}>Law Battles</Text>
        </View>
        <ScrollView contentContainerStyle={styles.introContent}>
          <MaterialCommunityIcons name="gavel" size={56} color={colors.accent} />
          <Text style={[styles.introTitle, { color: "#ffffff" }]}>Legal Head-to-Head</Text>
          <Text style={[styles.introSub, { color: colors.mutedForeground }]}>
            {TOTAL_QUESTIONS} quick-fire legal questions · 25 seconds each
          </Text>

          {/* Invite a Friend */}
          <TouchableOpacity
            style={[styles.inviteBtn, { borderColor: inviteShared ? "#22c55e" : colors.primary, backgroundColor: inviteShared ? "#22c55e18" : colors.primary + "15" }]}
            onPress={handleInviteFriend}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={inviteShared ? "check-circle" : "account-multiple-plus"}
              size={22}
              color={inviteShared ? "#22c55e" : colors.primary}
            />
            <View style={styles.inviteBtnInfo}>
              <Text style={[styles.inviteBtnTitle, { color: inviteShared ? "#22c55e" : "#ffffff" }]}>
                {inviteShared ? "Challenge Sent!" : "Challenge a Friend"}
              </Text>
              <Text style={[styles.inviteBtnSub, { color: colors.mutedForeground }]}>
                Share a game code and battle a real friend
              </Text>
            </View>
            <Feather name="share-2" size={18} color={inviteShared ? "#22c55e" : colors.primary} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or play vs AI</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.chooseLabel, { color: colors.accent }]}>CHOOSE YOUR OPPONENT</Text>
          {OPPONENTS.map((opp) => (
            <TouchableOpacity
              key={opp.name}
              style={[styles.oppCard, { backgroundColor: "rgba(0,0,0,0.65)", borderColor: opp.color }]}
              onPress={() => startBattle(opp)}
              activeOpacity={0.85}
            >
              <View style={[styles.oppIcon, { backgroundColor: opp.color + "22", borderColor: opp.color }]}>
                <MaterialCommunityIcons name={opp.icon as any} size={26} color={opp.color} />
              </View>
              <View style={styles.oppInfo}>
                <Text style={[styles.oppName, { color: "#ffffff" }]}>{opp.name}</Text>
                <Text style={[styles.oppDesc, { color: opp.color }]}>{opp.desc}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ─── RESULTS ──────────────────────────────────────────────────────────────
  if (phase === "results") {
    const won = playerScore > opponentScore;
    const draw = playerScore === opponentScore;
    const xpEarned = won ? playerScore * 40 + 50 : playerScore * 20 + 10;
    return (
      <View style={styles.container}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.86)" }]} />
        <ScrollView contentContainerStyle={[styles.resultsContent, { paddingTop: topPad + 28 }]}>
          <MaterialCommunityIcons
            name={won ? "trophy" : draw ? "handshake" : "scale-unbalanced"}
            size={72} color={won ? colors.accent : draw ? "#6366f1" : "#ef4444"}
          />
          <Text style={[styles.resultTitle, { color: won ? colors.accent : draw ? "#6366f1" : "#ef4444" }]}>
            {won ? "Court Adjourned — You Win!" : draw ? "The Court is Divided!" : "The Court Rules Against You"}
          </Text>
          <View style={styles.scoreSummary}>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNum, { color: "#22c55e" }]}>{playerScore}</Text>
              <Text style={[styles.scoreName, { color: "#ffffff" }]}>{profile.name || "You"}</Text>
            </View>
            <Text style={[styles.scoreVs, { color: colors.mutedForeground }]}>vs</Text>
            <View style={styles.scoreBox}>
              <Text style={[styles.scoreNum, { color: "#ef4444" }]}>{opponentScore}</Text>
              <Text style={[styles.scoreName, { color: "#ffffff" }]}>{selectedOpponent.name}</Text>
            </View>
          </View>
          <Text style={[styles.xpEarned, { color: colors.accent }]}>+{xpEarned} XP earned</Text>
          <View style={styles.roundHistory}>
            {resultHistory.map((r, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: r.player ? "#22c55e" : "#ef4444" }]} />
            ))}
          </View>

          {/* Share result */}
          <TouchableOpacity
            style={[styles.shareResultBtn, { borderColor: colors.accent, backgroundColor: colors.accent + "15" }]}
            onPress={async () => {
              const msg = `⚖️ I just scored ${playerScore}/${TOTAL_QUESTIONS} in a Law Battle vs ${selectedOpponent.name} in Leah's Legal Spider Solitaire! Can you beat that?`;
              await Share.share({ message: msg });
            }}
          >
            <Feather name="share-2" size={18} color={colors.accent} />
            <Text style={[styles.shareResultText, { color: colors.accent }]}>Share Your Result</Text>
          </TouchableOpacity>

          <View style={styles.resultBtns}>
            <TouchableOpacity style={[styles.resultBtn, { backgroundColor: colors.accent }]} onPress={() => { setPhase("intro"); clearTimers(); }}>
              <Feather name="refresh-cw" size={18} color="#000" />
              <Text style={[styles.resultBtnText, { color: "#000" }]}>Battle Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.resultBtn, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: colors.border, borderWidth: 1 }]} onPress={() => router.back()}>
              <Feather name="home" size={18} color="#ffffff" />
              <Text style={[styles.resultBtnText, { color: "#ffffff" }]}>Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── PLAYING ──────────────────────────────────────────────────────────────
  if (!q) return null;
  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <View style={styles.battleScores}>
          <Text style={[styles.battleYouScore, { color: "#22c55e" }]}>{playerScore}</Text>
          <Text style={[styles.battleVs, { color: colors.mutedForeground }]}>vs</Text>
          <Text style={[styles.battleOppScore, { color: "#ef4444" }]}>{opponentScore}</Text>
        </View>
        <Text style={[styles.battleProgress, { color: colors.mutedForeground }]}>Q {currentQ + 1}/{TOTAL_QUESTIONS}</Text>
      </View>

      <View style={[styles.timerBarWrap, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
        <Animated.View style={[styles.timerFill, {
          backgroundColor: timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? colors.accent : "#ef4444",
          width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }]} />
      </View>
      <Text style={[styles.timeNum, { color: timeLeft > 5 ? "#ffffff" : "#ef4444" }]}>{timeLeft}s</Text>

      <View style={[styles.oppStatus, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <MaterialCommunityIcons name={selectedOpponent.icon as any} size={16} color={selectedOpponent.color} />
        <Text style={[styles.oppStatusName, { color: selectedOpponent.color }]}>{selectedOpponent.name}</Text>
        {opponentAnswered ? (
          <View style={[styles.oppAnswerBadge, { backgroundColor: opponentCorrect ? "#22c55e22" : "#ef444422" }]}>
            <Feather name={opponentCorrect ? "check" : "x"} size={13} color={opponentCorrect ? "#22c55e" : "#ef4444"} />
            <Text style={[styles.oppAnswerText, { color: opponentCorrect ? "#22c55e" : "#ef4444" }]}>
              {opponentCorrect ? "Correct" : "Wrong"}
            </Text>
          </View>
        ) : (
          <Text style={[styles.oppThinkingText, { color: colors.mutedForeground }]}>Thinking...</Text>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.questionContent}>
        <View style={[styles.catBadge, { backgroundColor: (catColors[q.category] ?? "#ffffff") + "22" }]}>
          <Text style={[styles.catText, { color: catColors[q.category] ?? "#ffffff" }]}>{q.category.toUpperCase()} LAW</Text>
        </View>
        <Text style={[styles.caseTitle, { color: colors.accent }]}>{q.title}</Text>
        <Text style={[styles.caseFacts, { color: "#cccccc" }]}>{q.facts}</Text>
        <View style={[styles.qBox, { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.qText, { color: colors.primary }]}>{q.question}</Text>
        </View>
        {q.options.map((opt, idx) => {
          let bg = "rgba(255,255,255,0.06)"; let border = "rgba(255,255,255,0.15)"; let tc = "#ffffff";
          if (showResult) {
            if (idx === q.correctIndex) { bg = "#16653433"; border = "#22c55e"; tc = "#22c55e"; }
            else if (idx === selectedAnswer) { bg = "#ef444422"; border = "#ef4444"; tc = "#ef4444"; }
            else { bg = "transparent"; border = "rgba(255,255,255,0.07)"; tc = "#555"; }
          }
          return (
            <TouchableOpacity key={idx} style={[styles.option, { backgroundColor: bg, borderColor: border }]} onPress={() => handleAnswer(idx)} disabled={selectedAnswer !== null} activeOpacity={0.8}>
              <View style={[styles.optLetter, { borderColor: border }]}>
                <Text style={[styles.optLetterText, { color: tc }]}>{String.fromCharCode(65 + idx)}</Text>
              </View>
              <Text style={[styles.optText, { color: tc }]}>{opt}</Text>
              {showResult && idx === q.correctIndex && <Feather name="check-circle" size={17} color="#22c55e" />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  introContent: { padding: 20, alignItems: "center", gap: 14, paddingBottom: 40 },
  introTitle: { fontSize: 26, fontWeight: "700" },
  introSub: { fontSize: 14, textAlign: "center" },
  inviteBtn: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  inviteBtnInfo: { flex: 1 },
  inviteBtnTitle: { fontSize: 16, fontWeight: "700" },
  inviteBtnSub: { fontSize: 12, marginTop: 2 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  chooseLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  oppCard: { width: "100%", flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, borderWidth: 1.5, gap: 12 },
  oppIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  oppInfo: { flex: 1 },
  oppName: { fontSize: 16, fontWeight: "700" },
  oppDesc: { fontSize: 12, marginTop: 2 },
  battleScores: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center" },
  battleYouScore: { fontSize: 28, fontWeight: "700" },
  battleVs: { fontSize: 16 },
  battleOppScore: { fontSize: 28, fontWeight: "700" },
  battleProgress: { fontSize: 13 },
  timerBarWrap: { marginHorizontal: 16, height: 6, borderRadius: 3, overflow: "hidden" },
  timerFill: { height: "100%", borderRadius: 3 },
  timeNum: { textAlign: "center", fontSize: 18, fontWeight: "700", marginTop: 4, marginBottom: 4 },
  oppStatus: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, padding: 10, borderRadius: 10, marginBottom: 6 },
  oppStatusName: { fontWeight: "600", fontSize: 13, flex: 1 },
  oppAnswerBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  oppAnswerText: { fontSize: 12, fontWeight: "700" },
  oppThinkingText: { fontSize: 12, fontStyle: "italic" },
  questionContent: { padding: 16, gap: 11, paddingBottom: 40 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  catText: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  caseTitle: { fontSize: 18, fontWeight: "700" },
  caseFacts: { fontSize: 13, lineHeight: 21 },
  qBox: { borderWidth: 1, borderRadius: 10, padding: 14 },
  qText: { fontSize: 15, fontWeight: "600" },
  option: { flexDirection: "row", alignItems: "center", padding: 13, borderRadius: 10, borderWidth: 1.5, gap: 10 },
  optLetter: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  optLetterText: { fontSize: 13, fontWeight: "700" },
  optText: { flex: 1, fontSize: 14, lineHeight: 20 },
  resultsContent: { alignItems: "center", padding: 24, gap: 16, paddingBottom: 50 },
  resultTitle: { fontSize: 24, fontWeight: "700", textAlign: "center" },
  scoreSummary: { flexDirection: "row", alignItems: "center", gap: 24 },
  scoreBox: { alignItems: "center", gap: 4 },
  scoreNum: { fontSize: 48, fontWeight: "700" },
  scoreName: { fontSize: 13, fontWeight: "600" },
  scoreVs: { fontSize: 20 },
  xpEarned: { fontSize: 18, fontWeight: "700" },
  roundHistory: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  dot: { width: 14, height: 14, borderRadius: 7 },
  shareResultBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  shareResultText: { fontSize: 14, fontWeight: "700" },
  resultBtns: { flexDirection: "row", gap: 12, width: "100%" },
  resultBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  resultBtnText: { fontSize: 16, fontWeight: "700" },
});
