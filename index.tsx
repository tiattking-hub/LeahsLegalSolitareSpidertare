import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  ImageBackground,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame, getLevelTitle, getXPForNextLevel } from "@/context/GameContext";
import { getDailyCase } from "@/utils/legalCases";
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

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useGame();

  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showDailyCase, setShowDailyCase] = useState(false);
  const [dailySelectedAnswer, setDailySelectedAnswer] = useState<number | null>(null);

  const titleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Home screen always uses the House of Lords — a fixed grand lobby feel.
  // The game board uses the player's selected courtroom, so they're always different.
  const courtroomBg = COURTROOM_IMAGES.houseofLords;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const dailyCase = getDailyCase();
  const levelInfo = getXPForNextLevel(profile.xp);
  const xpProgress = levelInfo.next > levelInfo.current
    ? (profile.xp - levelInfo.current) / (levelInfo.next - levelInfo.current)
    : 1;

  // Show name modal on first launch
  useEffect(() => {
    if (!profile.name) {
      setTimeout(() => setShowNameModal(true), 600);
    }
    Animated.parallel([
      Animated.spring(titleAnim, { toValue: 1, useNativeDriver: false, tension: 60, friction: 8 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
    ]).start();
  }, []);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed.length >= 2) {
      updateProfile({ name: trimmed });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowNameModal(false);
    }
  };

  const cardBg = "rgba(20,8,0,0.72)";
  const cardBorder = colors.accent + "66";
  const catColors: Record<string, string> = {
    criminal: "#ef4444", contract: "#3b82f6", tort: "#f59e0b", constitutional: "#10b981",
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(4,12,8,0.72)" }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 8, paddingBottom: bottomPad + 24 }]}
      >
        {/* Logo + Title */}
        <Animated.View style={[
          styles.titleSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}>
          <View style={[styles.scaleIcon, { borderColor: colors.accent }]}>
            <MaterialCommunityIcons name="scale-balance" size={32} color={colors.accent} />
          </View>
          {/* Ornamental rule above title */}
          <View style={styles.ornamentRow}>
            <View style={[styles.ornamentLine, { backgroundColor: colors.accent + "55" }]} />
            <Text style={[styles.ornamentDot, { color: colors.accent }]}>✦</Text>
            <View style={[styles.ornamentLine, { backgroundColor: colors.accent + "55" }]} />
          </View>
          <Text style={[styles.title, { color: "#f5f0e8" }]}>Leah's</Text>
          <Text style={[styles.titleLegal, { color: colors.accent }]}>Legal Spider Solitaire</Text>
          <Text style={[styles.titleTagline, { color: colors.mutedForeground }]}>
            Caribbean Legal Education · Est. MMXXIV
          </Text>
          {/* Ornamental rule below title */}
          <View style={styles.ornamentRow}>
            <View style={[styles.ornamentLine, { backgroundColor: colors.accent + "55" }]} />
            <Text style={[styles.ornamentDot, { color: colors.accent }]}>⚖</Text>
            <View style={[styles.ornamentLine, { backgroundColor: colors.accent + "55" }]} />
          </View>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={[styles.profileCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => { setNameInput(profile.name); setShowNameModal(true); }}
            activeOpacity={0.88}
          >
            <View style={styles.profileTop}>
              <View style={[styles.avatarCircle, { borderColor: colors.accent }]}>
                <MaterialCommunityIcons name="gavel" size={22} color={colors.accent} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: "#ffffff" }]}>
                  {profile.name || "Tap to set your name"}
                </Text>
                <Text style={[styles.profileTitle, { color: colors.accent }]}>
                  {getLevelTitle(profile.xp)} · {profile.xp.toLocaleString()} XP
                </Text>
              </View>
              <Feather name="edit-2" size={16} color={colors.accent + "99"} />
            </View>
            {/* XP Progress bar */}
            <View style={styles.xpBarWrap}>
              <View style={[styles.xpBarBg, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
                <View style={[styles.xpBarFill, { backgroundColor: colors.accent, width: `${Math.min(100, xpProgress * 100)}%` }]} />
              </View>
              <Text style={[styles.xpBarLabel, { color: colors.mutedForeground }]}>
                {profile.xp - levelInfo.current} / {levelInfo.next - levelInfo.current} XP to {getLevelTitle(levelInfo.next)}
              </Text>
            </View>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.accent }]}>{profile.wins}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Wins</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.accent }]}>{profile.streak}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Streak</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.accent }]}>{profile.casebook.length}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>Cases</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Case of the Day */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            style={[styles.dailyCaseCard, { backgroundColor: cardBg, borderColor: colors.accent }]}
            onPress={() => setShowDailyCase(true)}
            activeOpacity={0.85}
          >
            <View style={styles.dailyHeader}>
              <View style={[styles.dailyBadge, { backgroundColor: colors.accent }]}>
                <Feather name="calendar" size={12} color="#000" />
                <Text style={styles.dailyBadgeText}>CASE OF THE DAY</Text>
              </View>
              <View style={[styles.catBadge, { backgroundColor: catColors[dailyCase.category] + "22" }]}>
                <Text style={[styles.catBadgeText, { color: catColors[dailyCase.category] }]}>
                  {dailyCase.category.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.dailyCaseTitle, { color: "#ffffff" }]}>{dailyCase.title}</Text>
            <Text style={[styles.dailyCaseFacts, { color: colors.mutedForeground }]} numberOfLines={2}>
              {dailyCase.facts}
            </Text>
            <View style={styles.dailyFooter}>
              <Text style={[styles.dailyTap, { color: colors.accent }]}>Tap to reveal the legal question →</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Main Action Buttons */}
        <Animated.View style={[styles.mainButtons, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push("/game-select")}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="cards-playing-outline" size={22} color="#000" />
            <Text style={[styles.primaryBtnText, { color: "#000" }]}>Play Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.5, borderColor: colors.accent + "88", marginTop: 10 }]}
            onPress={() => router.push("/exam")}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="pencil-box-outline" size={22} color={colors.accent} />
            <Text style={[styles.primaryBtnText, { color: colors.accent }]}>Legal Exam</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Menu Grid */}
        <Animated.View style={[styles.menuGrid, { opacity: fadeAnim }]}>
          {[
            { icon: "bank", label: "Courtrooms", route: "/courtrooms" },
            { icon: "book-open-page-variant", label: "Casebook", route: "/casebook" },
            { icon: "cards", label: "Flashcards", route: "/flashcards" },
            { icon: "sword-cross", label: "Law Battles", route: "/law-battles" },
            { icon: "trophy-outline", label: "Leaderboard", route: "/leaderboard" },
            { icon: "cog-outline", label: "Settings", route: "/settings" },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.menuItem, { backgroundColor: cardBg, borderColor: cardBorder }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name={item.icon as any} size={22} color={colors.accent} />
              <Text style={[styles.menuLabel, { color: "#ffffff" }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      {/* Name Entry Modal */}
      <Modal visible={showNameModal} transparent animationType="fade" onRequestClose={() => profile.name ? setShowNameModal(false) : null}>
        <View style={styles.modalOverlay}>
          <View style={[styles.nameModal, { backgroundColor: "#0d1a0d", borderColor: colors.accent }]}>
            <View style={[styles.nameModalIcon, { borderColor: colors.accent }]}>
              <MaterialCommunityIcons name="gavel" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.nameModalTitle, { color: colors.accent }]}>Welcome to the Bar</Text>
            <Text style={[styles.nameModalSub, { color: "#cccccc" }]}>
              Before we begin, Counsel — what shall the court call you?
            </Text>
            <TextInput
              style={[styles.nameInput, { color: "#ffffff", borderColor: colors.accent }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name..."
              placeholderTextColor="#666"
              maxLength={24}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity
              style={[styles.nameConfirmBtn, {
                backgroundColor: nameInput.trim().length >= 2 ? colors.accent : colors.muted,
              }]}
              onPress={handleSaveName}
              disabled={nameInput.trim().length < 2}
            >
              <Text style={[styles.nameConfirmText, { color: nameInput.trim().length >= 2 ? "#000" : colors.mutedForeground }]}>
                Take the Oath
              </Text>
              <Feather name="arrow-right" size={18} color={nameInput.trim().length >= 2 ? "#000" : colors.mutedForeground} />
            </TouchableOpacity>
            {profile.name ? (
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Daily Case Modal */}
      <Modal
        visible={showDailyCase}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDailyCase(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.caseModal, { backgroundColor: "#0a1a0f", borderColor: colors.border }]}>
            <View style={styles.caseModalHeader}>
              <View style={[styles.dailyBadge, { backgroundColor: colors.accent }]}>
                <Feather name="calendar" size={12} color="#000" />
                <Text style={styles.dailyBadgeText}>CASE OF THE DAY</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDailyCase(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.caseModalTitle, { color: colors.accent }]}>{dailyCase.title}</Text>
              <Text style={[styles.caseModalFacts, { color: "#dddddd" }]}>{dailyCase.facts}</Text>
              <View style={[styles.questionBox, { borderColor: colors.primary, backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.questionLabel, { color: colors.primary }]}>Legal Question</Text>
                <Text style={[styles.questionText, { color: "#ffffff" }]}>{dailyCase.question}</Text>
              </View>

              {dailyCase.options.map((opt, i) => {
                const answered = dailySelectedAnswer !== null;
                const isSelected = dailySelectedAnswer === i;
                const isCorrect = i === dailyCase.correctIndex;
                let borderColor = colors.border;
                let textColor = "#cccccc";
                let letterColor = colors.mutedForeground;
                let icon: "check-circle" | "x-circle" | null = null;
                if (answered) {
                  if (isCorrect) {
                    borderColor = "#22c55e";
                    textColor = "#22c55e";
                    letterColor = "#22c55e";
                    icon = "check-circle";
                  } else if (isSelected) {
                    borderColor = "#ef4444";
                    textColor = "#ef4444";
                    letterColor = "#ef4444";
                    icon = "x-circle";
                  }
                } else if (isSelected) {
                  borderColor = colors.accent;
                  textColor = "#ffffff";
                  letterColor = colors.accent;
                }
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      if (dailySelectedAnswer === null) {
                        setDailySelectedAnswer(i);
                        Haptics.notificationAsync(
                          i === dailyCase.correctIndex
                            ? Haptics.NotificationFeedbackType.Success
                            : Haptics.NotificationFeedbackType.Error
                        );
                      }
                    }}
                    disabled={dailySelectedAnswer !== null}
                    activeOpacity={0.75}
                    style={[styles.optionRow, { borderColor }]}
                  >
                    <Text style={[styles.optionLetter, { color: letterColor }]}>
                      {String.fromCharCode(65 + i)}
                    </Text>
                    <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                    {icon && <Feather name={icon} size={16} color={isCorrect ? "#22c55e" : "#ef4444"} />}
                  </TouchableOpacity>
                );
              })}

              {/* Explanation + principle only shown after answering */}
              {dailySelectedAnswer !== null && (
                <>
                  <View style={[styles.resultBanner, {
                    backgroundColor: dailySelectedAnswer === dailyCase.correctIndex ? "#22c55e18" : "#ef444418",
                    borderColor: dailySelectedAnswer === dailyCase.correctIndex ? "#22c55e" : "#ef4444",
                  }]}>
                    <Feather
                      name={dailySelectedAnswer === dailyCase.correctIndex ? "check-circle" : "x-circle"}
                      size={18}
                      color={dailySelectedAnswer === dailyCase.correctIndex ? "#22c55e" : "#ef4444"}
                    />
                    <Text style={[styles.resultBannerText, {
                      color: dailySelectedAnswer === dailyCase.correctIndex ? "#22c55e" : "#ef4444",
                    }]}>
                      {dailySelectedAnswer === dailyCase.correctIndex ? "Correct! Well argued, Counsel." : "Not quite — the correct answer is highlighted above."}
                    </Text>
                  </View>
                  <View style={[styles.principleBox, { backgroundColor: colors.accent + "18", borderColor: colors.accent }]}>
                    <Text style={[styles.principleLabel, { color: colors.accent }]}>LEGAL PRINCIPLE</Text>
                    <Text style={[styles.principleText, { color: "#ffffff" }]}>{dailyCase.principle}</Text>
                  </View>
                  <Text style={[styles.explainText, { color: "#dddddd" }]}>{dailyCase.explanation}</Text>
                </>
              )}

              {/* Prompt to answer if not yet */}
              {dailySelectedAnswer === null && (
                <Text style={[styles.choosePrompt, { color: colors.mutedForeground }]}>
                  Tap an option to submit your answer
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 14 },
  titleSection: { alignItems: "center", gap: 4, paddingTop: 8 },
  scaleIcon: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,168,76,0.12)",
    marginBottom: 4,
  },
  ornamentRow: { flexDirection: "row", alignItems: "center", gap: 10, width: "80%" },
  ornamentLine: { flex: 1, height: 1 },
  ornamentDot: { fontSize: 12 },
  title: { fontSize: 32, fontWeight: "700", letterSpacing: 2, fontFamily: "Georgia" },
  titleLegal: { fontSize: 17, fontWeight: "400", letterSpacing: 1.5, fontFamily: "Georgia", fontStyle: "italic" },
  titleTagline: { fontSize: 11, letterSpacing: 0.8, marginTop: 2 },
  divider: { height: 2, width: 60, borderRadius: 2, marginTop: 4 },
  profileCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12,
  },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,168,76,0.12)",
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "700", fontFamily: "Georgia" },
  profileTitle: { fontSize: 13, marginTop: 2, fontFamily: "Georgia", fontStyle: "italic" },
  xpBarWrap: { gap: 4 },
  xpBarBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3 },
  xpBarLabel: { fontSize: 10, textAlign: "right" },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 2 },
  statNum: { fontSize: 18, fontWeight: "700" },
  statLbl: { fontSize: 10 },
  statDivider: { width: 1, height: 28 },
  dailyCaseCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 8 },
  dailyHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  dailyBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  dailyBadgeText: { fontSize: 10, fontWeight: "700", color: "#000" },
  catBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: "700" },
  dailyCaseTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Georgia", fontStyle: "italic" },
  dailyCaseFacts: { fontSize: 13, lineHeight: 20 },
  dailyFooter: {},
  dailyTap: { fontSize: 12, fontWeight: "600" },
  mainButtons: {},
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, padding: 18, borderRadius: 16,
  },
  primaryBtnText: { fontSize: 18, fontWeight: "700" },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  menuItem: {
    width: "47%", flexGrow: 1, borderRadius: 14, borderWidth: 1,
    padding: 16, alignItems: "center", gap: 8,
  },
  menuLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 20 },
  nameModal: {
    borderRadius: 24, borderWidth: 1.5, padding: 28, alignItems: "center", gap: 16,
  },
  nameModalIcon: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(201,168,76,0.12)",
  },
  nameModalTitle: { fontSize: 24, fontWeight: "700", textAlign: "center", fontFamily: "Georgia" },
  nameModalSub: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  nameInput: {
    width: "100%", borderWidth: 2, borderRadius: 12, padding: 14,
    fontSize: 18, fontWeight: "600", textAlign: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  nameConfirmBtn: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, padding: 16, borderRadius: 14,
  },
  nameConfirmText: { fontSize: 17, fontWeight: "700" },
  skipText: { fontSize: 13, marginTop: 4 },
  caseModal: {
    borderRadius: 20, borderWidth: 1, padding: 20, maxHeight: "90%",
  },
  caseModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  caseModalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 10, fontFamily: "Georgia", fontStyle: "italic" },
  caseModalFacts: { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  questionBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12, gap: 6 },
  questionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  questionText: { fontSize: 15, fontWeight: "600" },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8,
  },
  optionLetter: { fontSize: 14, fontWeight: "700", width: 20 },
  optionText: { flex: 1, fontSize: 14 },
  principleBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 12, marginBottom: 10 },
  principleLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 },
  principleText: { fontSize: 14, fontStyle: "italic", fontWeight: "600" },
  explainText: { fontSize: 13, lineHeight: 21, marginBottom: 20 },
  resultBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 6, marginBottom: 4,
  },
  resultBannerText: { fontSize: 13, fontWeight: "600", flex: 1 },
  choosePrompt: { fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 16, fontStyle: "italic" },
});
