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
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import { STATIC_CASES } from "@/utils/legalCases";
import type { LegalCase } from "@/utils/legalCases";
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

const EXAM_LENGTH = 10;
const TIME_PER_Q = 45;

type ExamPhase = "intro" | "question" | "results";

interface CategoryScore {
  correct: number;
  total: number;
}

const CAT_COLORS: Record<string, string> = {
  criminal: "#ef4444",
  contract: "#3b82f6",
  tort: "#f59e0b",
  constitutional: "#10b981",
};

const CAT_ICONS: Record<string, string> = {
  criminal: "handcuffs",
  contract: "file-sign",
  tort: "scale-balance",
  constitutional: "bank",
};

function getGrade(score: number, total: number): { letter: string; label: string; color: string } {
  const pct = score / total;
  if (pct >= 0.9) return { letter: "A+", label: "Distinction — Outstanding Counsel!", color: "#c9a84c" };
  if (pct >= 0.8) return { letter: "A",  label: "Merit — Excellent Legal Knowledge",  color: "#22c55e" };
  if (pct >= 0.7) return { letter: "B",  label: "Good — Above Average Performance",   color: "#3b82f6" };
  if (pct >= 0.6) return { letter: "C",  label: "Pass — Satisfactory Understanding",  color: "#a78bfa" };
  if (pct >= 0.5) return { letter: "D",  label: "Borderline — Keep Studying",         color: "#f59e0b" };
  return               { letter: "F",  label: "Fail — More Revision Needed",          color: "#ef4444" };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildExam(): LegalCase[] {
  const byCategory = STATIC_CASES.reduce<Record<string, LegalCase[]>>((acc, c) => {
    acc[c.category] = [...(acc[c.category] ?? []), c];
    return acc;
  }, {});
  const cats = Object.keys(byCategory);
  const perCat = Math.ceil(EXAM_LENGTH / cats.length);
  const selected: LegalCase[] = [];
  for (const cat of cats) {
    selected.push(...shuffle(byCategory[cat]).slice(0, perCat));
  }
  return shuffle(selected).slice(0, EXAM_LENGTH);
}

export default function ExamScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, addXP } = useGame();
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;

  // State
  const [phase, setPhase]               = useState<ExamPhase>("intro");
  const [questions]                     = useState<LegalCase[]>(() => buildExam());
  const [qIndex, setQIndex]             = useState(0);
  const [selected, setSelected]         = useState<number | null>(null);
  const [score, setScore]               = useState(0);
  const [catScores, setCatScores]       = useState<Record<string, CategoryScore>>({});
  const [timeLeft, setTimeLeft]         = useState(TIME_PER_Q);
  const [timedOut, setTimedOut]         = useState(false);
  const [xpEarned, setXpEarned]         = useState(0);
  const [answers, setAnswers]           = useState<(number | null)[]>([]);

  // Animations
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const timerWidth  = useRef(new Animated.Value(1)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const q = questions[qIndex];

  const startTimerAnimation = useCallback(() => {
    timerWidth.setValue(1);
    if (timerAnimRef.current) timerAnimRef.current.stop();
    timerAnimRef.current = Animated.timing(timerWidth, {
      toValue: 0,
      duration: TIME_PER_Q * 1000,
      useNativeDriver: false,
    });
    timerAnimRef.current.start();
  }, [timerWidth]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timerAnimRef.current) timerAnimRef.current.stop();
  }, []);

  const startTimer = useCallback(() => {
    setTimeLeft(TIME_PER_Q);
    stopTimer();
    startTimerAnimation();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setTimedOut(true);
          setSelected(-1);
          setAnswers((prev) => {
            const next = [...prev];
            next[qIndex] = -1;
            return next;
          });
          setCatScores((prev) => ({
            ...prev,
            [q.category]: {
              correct: (prev[q.category]?.correct ?? 0),
              total: (prev[q.category]?.total ?? 0) + 1,
            },
          }));
          if (profile.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [qIndex, q, stopTimer, startTimerAnimation, profile.hapticsEnabled]);

  // Slide-in animation for each new question
  const animateSlideIn = useCallback(() => {
    slideAnim.setValue(60);
    Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: false }).start();
  }, [slideAnim]);

  useEffect(() => {
    if (phase === "question") {
      setSelected(null);
      setTimedOut(false);
      animateSlideIn();
      startTimer();
    }
    return () => stopTimer();
  }, [qIndex, phase]);

  const handleAnswer = (optionIdx: number) => {
    if (selected !== null) return;
    stopTimer();
    setSelected(optionIdx);
    const correct = optionIdx === q.correctIndex;
    const newAnswers = [...answers];
    newAnswers[qIndex] = optionIdx;
    setAnswers(newAnswers);
    setCatScores((prev) => ({
      ...prev,
      [q.category]: {
        correct: (prev[q.category]?.correct ?? 0) + (correct ? 1 : 0),
        total: (prev[q.category]?.total ?? 0) + 1,
      },
    }));
    if (correct) {
      setScore((s) => s + 1);
      if (profile.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      if (profile.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleNext = () => {
    if (qIndex >= questions.length - 1) {
      stopTimer();
      const finalScore = score + (selected === q.correctIndex ? 0 : 0);
      const xp = score * 30 + (score >= 8 ? 100 : score >= 6 ? 50 : 0);
      setXpEarned(xp);
      addXP(xp);
      setPhase("results");
    } else {
      setQIndex((i) => i + 1);
    }
  };

  const handleRestart = () => {
    setPhase("intro");
    setQIndex(0);
    setSelected(null);
    setScore(0);
    setCatScores({});
    setTimedOut(false);
    setAnswers([]);
  };

  const answered = selected !== null;
  const timerColor = timeLeft > 20 ? colors.accent : timeLeft > 10 ? "#f59e0b" : "#ef4444";

  // ── INTRO PHASE ──────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <View style={styles.root}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={["rgba(0,0,0,0.88)", "rgba(4,16,9,0.95)"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.introWrap, { paddingTop: topPad + 20 }]}>
          <View style={[styles.introIcon, { borderColor: colors.accent, backgroundColor: colors.accent + "15" }]}>
            <MaterialCommunityIcons name="pencil-box-outline" size={44} color={colors.accent} />
          </View>
          <Text style={[styles.introTitle, { color: colors.accent }]}>Legal Exam</Text>
          <Text style={[styles.introSub, { color: "#cccccc" }]}>
            Test your knowledge of Caribbean and international law. You'll receive {EXAM_LENGTH} questions across criminal, contract, tort, and constitutional law.
          </Text>

          <View style={[styles.rulesCard, { backgroundColor: "rgba(201,168,76,0.08)", borderColor: colors.accent + "44" }]}>
            {[
              { icon: "help-circle-outline", text: `${EXAM_LENGTH} questions · multiple choice` },
              { icon: "timer-outline", text: `${TIME_PER_Q} seconds per question` },
              { icon: "check-circle-outline", text: "Immediate marking after each answer" },
              { icon: "book-open-outline", text: "Full explanation shown for every question" },
              { icon: "star-circle-outline", text: "Earn XP — up to 400 XP for a top score" },
            ].map((r, i) => (
              <View key={i} style={styles.ruleRow}>
                <MaterialCommunityIcons name={r.icon as any} size={18} color={colors.accent} />
                <Text style={[styles.ruleText, { color: "#cccccc" }]}>{r.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.accent }]}
            onPress={() => setPhase("question")}
          >
            <MaterialCommunityIcons name="gavel" size={20} color="#000" />
            <Text style={[styles.startBtnText, { color: "#000" }]}>Begin Examination</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 14 }}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── RESULTS PHASE ────────────────────────────────────────────────────────────
  if (phase === "results") {
    const grade = getGrade(score, questions.length);
    const pct = Math.round((score / questions.length) * 100);
    return (
      <View style={styles.root}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient colors={["rgba(0,0,0,0.88)", "rgba(4,16,9,0.95)"]} style={StyleSheet.absoluteFill} />
        <ScrollView contentContainerStyle={[styles.resultsWrap, { paddingTop: topPad + 20 }]}>

          {/* Grade badge */}
          <View style={[styles.gradeBadge, { borderColor: grade.color, backgroundColor: grade.color + "18" }]}>
            <Text style={[styles.gradeLetter, { color: grade.color }]}>{grade.letter}</Text>
          </View>
          <Text style={[styles.gradeLabel, { color: grade.color, fontFamily: "Georgia" }]}>{grade.label}</Text>

          {/* Score */}
          <View style={[styles.scoreBox, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.accent + "44" }]}>
            <Text style={[styles.scoreNum, { color: colors.accent }]}>{score}/{questions.length}</Text>
            <Text style={[styles.scorePct, { color: "#cccccc" }]}>{pct}% correct</Text>
            <Text style={[styles.scoreXP, { color: "#22c55e" }]}>+{xpEarned} XP earned</Text>
          </View>

          {/* Category breakdown */}
          <Text style={[styles.breakdownTitle, { color: colors.accent }]}>PERFORMANCE BY AREA</Text>
          <View style={styles.catGrid}>
            {Object.entries(catScores).map(([cat, s]) => {
              const catPct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              const col = CAT_COLORS[cat] ?? colors.accent;
              return (
                <View key={cat} style={[styles.catCard, { backgroundColor: col + "12", borderColor: col + "44" }]}>
                  <MaterialCommunityIcons name={CAT_ICONS[cat] as any ?? "gavel"} size={20} color={col} />
                  <Text style={[styles.catName, { color: col }]}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                  <Text style={[styles.catScore, { color: "#ffffff" }]}>{s.correct}/{s.total}</Text>
                  <View style={[styles.catBar, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                    <View style={[styles.catBarFill, { width: `${catPct}%`, backgroundColor: col }]} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Review wrong answers */}
          {answers.some((a, i) => a !== questions[i].correctIndex) && (
            <>
              <Text style={[styles.breakdownTitle, { color: "#ef4444", marginTop: 8 }]}>QUESTIONS TO REVIEW</Text>
              {questions.map((q2, i) => {
                const ans = answers[i];
                if (ans === q2.correctIndex) return null;
                return (
                  <View key={i} style={[styles.reviewCard, { backgroundColor: "#ef444412", borderColor: "#ef444444" }]}>
                    <Text style={[styles.reviewQ, { color: "#ffffff" }]}>{i + 1}. {q2.title}</Text>
                    <Text style={[styles.reviewPrinciple, { color: "#ef4444" }]}>
                      {ans === -1 ? "⏱ Time ran out" : `✗ You chose: ${q2.options[ans ?? 0]}`}
                    </Text>
                    <Text style={[styles.reviewCorrect, { color: "#22c55e" }]}>
                      ✓ Correct: {q2.options[q2.correctIndex]}
                    </Text>
                    <Text style={[styles.reviewExplain, { color: "#cccccc" }]}>{q2.explanation}</Text>
                  </View>
                );
              })}
            </>
          )}

          {/* Action buttons */}
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: colors.accent, marginTop: 8 }]}
            onPress={handleRestart}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#000" />
            <Text style={[styles.startBtnText, { color: "#000" }]}>Take Exam Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }]}
            onPress={() => router.back()}
          >
            <Feather name="home" size={18} color="#fff" />
            <Text style={[styles.startBtnText, { color: "#fff" }]}>Back to Home</Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    );
  }

  // ── QUESTION PHASE ────────────────────────────────────────────────────────────
  const catColor = CAT_COLORS[q.category] ?? colors.accent;

  return (
    <View style={styles.root}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.82)", "rgba(4,16,9,0.90)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={[styles.qHeader, { paddingTop: topPad + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={styles.qProgress}>
          <View style={[styles.qProgressBg, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
            <View style={[styles.qProgressFill, { backgroundColor: colors.accent, width: `${((qIndex + 1) / questions.length) * 100}%` }]} />
          </View>
          <Text style={[styles.qProgressLabel, { color: colors.mutedForeground }]}>
            Question {qIndex + 1} of {questions.length}
          </Text>
        </View>

        <View style={[styles.scorePill, { backgroundColor: "rgba(201,168,76,0.15)", borderColor: colors.accent + "55" }]}>
          <MaterialCommunityIcons name="star-four-points" size={12} color={colors.accent} />
          <Text style={[styles.scorePillText, { color: colors.accent }]}>{score}</Text>
        </View>
      </View>

      {/* Timer bar */}
      {!answered && (
        <View style={[styles.timerTrack, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
          <Animated.View
            style={[
              styles.timerFill,
              {
                backgroundColor: timerColor,
                width: timerWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              },
            ]}
          />
        </View>
      )}
      {!answered && (
        <Text style={[styles.timerLabel, { color: timerColor }]}>{timeLeft}s</Text>
      )}

      {/* ── Question card ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.qContent}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* Category + difficulty badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: catColor + "20", borderColor: catColor + "55" }]}>
              <MaterialCommunityIcons name={CAT_ICONS[q.category] as any ?? "gavel"} size={13} color={catColor} />
              <Text style={[styles.catBadgeText, { color: catColor }]}>{q.category.toUpperCase()}</Text>
            </View>
            <View style={[styles.diffBadge, { backgroundColor: "rgba(255,255,255,0.07)" }]}>
              <Text style={[styles.diffBadgeText, { color: colors.mutedForeground }]}>{q.difficulty.toUpperCase()}</Text>
            </View>
          </View>

          {/* Case title */}
          <Text style={[styles.caseTitle, { color: colors.accent }]}>{q.title}</Text>

          {/* Facts */}
          <View style={[styles.factsBox, { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }]}>
            <Text style={[styles.factsLabel, { color: colors.mutedForeground }]}>CASE FACTS</Text>
            <Text style={[styles.factsText, { color: "#dddddd" }]}>{q.facts}</Text>
          </View>

          {/* Question */}
          <View style={[styles.questionBox, { backgroundColor: catColor + "12", borderColor: catColor + "55" }]}>
            <Text style={[styles.questionLabel, { color: catColor }]}>LEGAL QUESTION</Text>
            <Text style={[styles.questionText, { color: "#ffffff" }]}>{q.question}</Text>
          </View>

          {/* Options */}
          {q.options.map((opt, i) => {
            const isSelected  = selected === i;
            const isCorrect   = i === q.correctIndex;
            const isTimedOut  = timedOut && i === q.correctIndex;

            let borderColor = "rgba(255,255,255,0.15)";
            let bgColor     = "rgba(255,255,255,0.04)";
            let textColor   = "#cccccc";
            let letterBg    = "rgba(255,255,255,0.1)";
            let letterColor = colors.mutedForeground;
            let icon: null | "check-circle" | "close-circle" = null;

            if (answered) {
              if (isCorrect || isTimedOut) {
                borderColor = "#22c55e";
                bgColor     = "#22c55e14";
                textColor   = "#22c55e";
                letterBg    = "#22c55e22";
                letterColor = "#22c55e";
                icon        = "check-circle";
              } else if (isSelected) {
                borderColor = "#ef4444";
                bgColor     = "#ef444414";
                textColor   = "#ef4444";
                letterBg    = "#ef444422";
                letterColor = "#ef4444";
                icon        = "close-circle";
              }
            }

            return (
              <TouchableOpacity
                key={i}
                onPress={() => handleAnswer(i)}
                disabled={answered}
                activeOpacity={0.75}
                style={[styles.optionBtn, { borderColor, backgroundColor: bgColor }]}
              >
                <View style={[styles.optionLetter, { backgroundColor: letterBg }]}>
                  <Text style={[styles.optionLetterText, { color: letterColor }]}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {icon && (
                  <MaterialCommunityIcons
                    name={icon}
                    size={18}
                    color={isCorrect || isTimedOut ? "#22c55e" : "#ef4444"}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Timed-out or answered prompt */}
          {!answered && (
            <Text style={[styles.choosePrompt, { color: colors.mutedForeground }]}>
              Select an answer
            </Text>
          )}

          {/* ── Post-answer panel ── */}
          {answered && (
            <View style={styles.explainSection}>

              {/* Result banner */}
              <View style={[styles.resultBanner, {
                backgroundColor: timedOut ? "#f59e0b14" : selected === q.correctIndex ? "#22c55e14" : "#ef444414",
                borderColor:     timedOut ? "#f59e0b"   : selected === q.correctIndex ? "#22c55e"   : "#ef4444",
              }]}>
                <MaterialCommunityIcons
                  name={timedOut ? "timer-off" : selected === q.correctIndex ? "check-circle" : "close-circle"}
                  size={22}
                  color={timedOut ? "#f59e0b" : selected === q.correctIndex ? "#22c55e" : "#ef4444"}
                />
                <Text style={[styles.resultBannerText, {
                  color: timedOut ? "#f59e0b" : selected === q.correctIndex ? "#22c55e" : "#ef4444",
                }]}>
                  {timedOut
                    ? "Time's up! The correct answer is highlighted above."
                    : selected === q.correctIndex
                      ? "Correct! Well argued, Counsel."
                      : "Not quite. The correct answer is highlighted above."}
                </Text>
              </View>

              {/* Legal principle */}
              <View style={[styles.principleBox, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "55" }]}>
                <Text style={[styles.principleLabel, { color: colors.accent }]}>⚖ LEGAL PRINCIPLE</Text>
                <Text style={[styles.principleText, { color: "#f0ead6" }]}>{q.principle}</Text>
              </View>

              {/* Explanation */}
              <View style={[styles.explainBox, { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.12)" }]}>
                <Text style={[styles.explainLabel, { color: colors.mutedForeground }]}>WHY?</Text>
                <Text style={[styles.explainText, { color: "#dddddd" }]}>{q.explanation}</Text>
              </View>

              {/* ELI5 */}
              {q.eli5 && (
                <View style={[styles.eli5Box, { backgroundColor: "#3b82f610", borderColor: "#3b82f644" }]}>
                  <Text style={[styles.eli5Label, { color: "#3b82f6" }]}>💡 SIMPLY PUT</Text>
                  <Text style={[styles.eli5Text, { color: "#bbbbbb" }]}>{q.eli5}</Text>
                </View>
              )}

              {/* Next button */}
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.accent }]}
                onPress={handleNext}
              >
                <Text style={[styles.nextBtnText, { color: "#000" }]}>
                  {qIndex >= questions.length - 1 ? "View Results" : "Next Question"}
                </Text>
                <Feather name={qIndex >= questions.length - 1 ? "award" : "arrow-right"} size={18} color="#000" />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Intro
  introWrap: {
    flex: 1, paddingHorizontal: 24, alignItems: "center", gap: 18, paddingBottom: 40,
  },
  introIcon: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  introTitle: { fontSize: 30, fontWeight: "700", fontFamily: "Georgia" },
  introSub: { fontSize: 15, textAlign: "center", lineHeight: 24 },
  rulesCard: {
    width: "100%", borderWidth: 1, borderRadius: 16,
    padding: 18, gap: 12,
  },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  ruleText: { fontSize: 14, flex: 1 },
  startBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10, padding: 17, borderRadius: 16,
  },
  startBtnText: { fontSize: 17, fontWeight: "700" },
  cancelText: { fontSize: 14 },

  // Question header
  qHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingBottom: 8, gap: 10,
  },
  backBtn: { padding: 4 },
  qProgress: { flex: 1, gap: 4 },
  qProgressBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  qProgressFill: { height: "100%", borderRadius: 3 },
  qProgressLabel: { fontSize: 11 },
  scorePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  scorePillText: { fontSize: 14, fontWeight: "700" },

  // Timer
  timerTrack: { height: 4, marginHorizontal: 0 },
  timerFill: { height: "100%" },
  timerLabel: { textAlign: "center", fontSize: 12, fontWeight: "700", marginTop: 4, marginBottom: -4 },

  // Question body
  qContent: { paddingHorizontal: 16, paddingVertical: 16, gap: 12, paddingBottom: 40 },
  badgeRow: { flexDirection: "row", gap: 8 },
  catBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  catBadgeText: { fontSize: 10, fontWeight: "700" },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  diffBadgeText: { fontSize: 10, fontWeight: "600" },
  caseTitle: { fontSize: 19, fontWeight: "700", fontFamily: "Georgia", fontStyle: "italic" },
  factsBox: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  factsLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  factsText: { fontSize: 13, lineHeight: 21 },
  questionBox: { borderWidth: 1.5, borderRadius: 12, padding: 14, gap: 6 },
  questionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  questionText: { fontSize: 16, fontWeight: "600", lineHeight: 24 },

  // Options
  optionBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  optionLetter: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  optionLetterText: { fontSize: 13, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  choosePrompt: { textAlign: "center", fontSize: 13, fontStyle: "italic", marginTop: 4 },

  // Post-answer
  explainSection: { gap: 12, marginTop: 4 },
  resultBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderWidth: 1.5, borderRadius: 12, padding: 14,
  },
  resultBannerText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  principleBox: {
    borderWidth: 1.5, borderRadius: 12, padding: 14, gap: 6,
  },
  principleLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  principleText: { fontSize: 14, fontStyle: "italic", lineHeight: 22, fontFamily: "Georgia" },
  explainBox: {
    borderWidth: 1, borderRadius: 12, padding: 14, gap: 6,
  },
  explainLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  explainText: { fontSize: 13, lineHeight: 22 },
  eli5Box: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 5 },
  eli5Label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  eli5Text: { fontSize: 13, lineHeight: 21, fontStyle: "italic" },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 17, borderRadius: 14, marginTop: 4,
  },
  nextBtnText: { fontSize: 17, fontWeight: "700" },

  // Results
  resultsWrap: { paddingHorizontal: 20, gap: 14, paddingBottom: 40, alignItems: "center" },
  gradeBadge: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 3,
    alignItems: "center", justifyContent: "center",
  },
  gradeLetter: { fontSize: 42, fontWeight: "700", fontFamily: "Georgia" },
  gradeLabel: { fontSize: 16, textAlign: "center", lineHeight: 22, fontWeight: "600" },
  scoreBox: {
    width: "100%", borderWidth: 1, borderRadius: 16, padding: 20,
    alignItems: "center", gap: 6,
  },
  scoreNum: { fontSize: 36, fontWeight: "700", fontFamily: "Georgia" },
  scorePct: { fontSize: 16 },
  scoreXP: { fontSize: 15, fontWeight: "700" },
  breakdownTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 2, alignSelf: "flex-start" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, width: "100%" },
  catCard: {
    flex: 1, minWidth: "45%", borderWidth: 1, borderRadius: 14,
    padding: 14, gap: 6, alignItems: "center",
  },
  catName: { fontSize: 12, fontWeight: "700" },
  catScore: { fontSize: 20, fontWeight: "700", fontFamily: "Georgia" },
  catBar: { height: 6, width: "100%", borderRadius: 3, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 3 },
  reviewCard: {
    width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, gap: 6,
  },
  reviewQ: { fontSize: 14, fontWeight: "700" },
  reviewPrinciple: { fontSize: 13 },
  reviewCorrect: { fontSize: 13, fontWeight: "600" },
  reviewExplain: { fontSize: 12, lineHeight: 20, marginTop: 4, fontStyle: "italic" },
});
