import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";

const COURTROOM_IMAGES: Record<string, any> = {
  stvincent: require("../assets/images/courtroom_stvincent.png"),
  barbados: require("../assets/images/courtroom_barbados.png"),
  grenada: require("../assets/images/courtroom_grenada.png"),
  bahamas: require("../assets/images/courtroom_bahamas.png"),
};

export type GameType = "spider" | "klondike";
export type Difficulty = "super_easy" | "easy" | "medium" | "hard" | "super_hard";

const GAME_TYPES = [
  {
    id: "spider" as GameType,
    name: "Spider Solitaire",
    desc: "Build 8 complete suit sequences from King to Ace. Cards deal in rows of 10.",
    icon: "spider-web",
    color: "#c9a84c",
  },
  {
    id: "klondike" as GameType,
    name: "Classic Solitaire",
    desc: "Stack cards in alternating colours. Move all cards to 4 foundation piles.",
    icon: "cards",
    color: "#7c3aed",
  },
];

const DIFFICULTIES = [
  {
    id: "super_easy" as Difficulty,
    label: "Super Easy",
    desc: "1 suit · Unlimited undo · Free hints · Auto-tips",
    color: "#22c55e",
    icon: "smile",
  },
  {
    id: "easy" as Difficulty,
    label: "Easy",
    desc: "1 suit · 20 undos · Hints via legal Q&A",
    color: "#84cc16",
    icon: "thumbs-up",
  },
  {
    id: "medium" as Difficulty,
    label: "Medium",
    desc: "2 suits · 10 undos · Hints via legal Q&A",
    color: "#f59e0b",
    icon: "activity",
  },
  {
    id: "hard" as Difficulty,
    label: "Hard",
    desc: "4 suits · 5 undos · Limited hints",
    color: "#ef4444",
    icon: "zap",
  },
  {
    id: "super_hard" as Difficulty,
    label: "Super Hard",
    desc: "4 suits · 2 undos · No hints",
    color: "#7c3aed",
    icon: "alert-octagon",
  },
];

export default function GameSelectScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useGame();

  const [gameType, setGameType] = useState<GameType>("spider");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const isDark = profile.theme === "dark";
  const cardBg = isDark ? "rgba(5,20,12,0.88)" : "rgba(255,252,240,0.88)";
  const textColor = isDark ? "#ffffff" : "#0d1a0d";

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/game", params: { gameType, difficulty } } as any);
  };

  const selectedDiff = DIFFICULTIES.find((d) => d.id === difficulty)!;

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.75)" : "rgba(240,230,200,0.6)" }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="cards-playing" size={22} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.accent }]}>Choose Your Game</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Game Type */}
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>GAME TYPE</Text>
        <View style={styles.typeRow}>
          {GAME_TYPES.map((g) => {
            const sel = gameType === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: sel ? g.color + "25" : cardBg,
                    borderColor: sel ? g.color : colors.border,
                    borderWidth: sel ? 2 : 1,
                  },
                ]}
                onPress={() => { setGameType(g.id); Haptics.selectionAsync(); }}
              >
                <MaterialCommunityIcons name={g.icon as any} size={32} color={sel ? g.color : colors.mutedForeground} />
                <Text style={[styles.typeName, { color: sel ? g.color : textColor }]}>{g.name}</Text>
                <Text style={[styles.typeDesc, { color: colors.mutedForeground }]}>{g.desc}</Text>
                {sel && (
                  <View style={[styles.checkBadge, { backgroundColor: g.color }]}>
                    <Feather name="check" size={12} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Difficulty */}
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>DIFFICULTY</Text>
        <View style={styles.diffList}>
          {DIFFICULTIES.map((d) => {
            const sel = difficulty === d.id;
            return (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.diffCard,
                  {
                    backgroundColor: sel ? d.color + "20" : cardBg,
                    borderColor: sel ? d.color : colors.border,
                    borderWidth: sel ? 2 : 1,
                  },
                ]}
                onPress={() => { setDifficulty(d.id); Haptics.selectionAsync(); }}
              >
                <View style={[styles.diffIcon, { backgroundColor: d.color + "22" }]}>
                  <Feather name={d.icon as any} size={20} color={d.color} />
                </View>
                <View style={styles.diffInfo}>
                  <Text style={[styles.diffLabel, { color: sel ? d.color : textColor }]}>{d.label}</Text>
                  <Text style={[styles.diffDesc, { color: colors.mutedForeground }]}>{d.desc}</Text>
                </View>
                {sel && <Feather name="check-circle" size={20} color={d.color} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: selectedDiff.color, shadowColor: selectedDiff.color }]}
          onPress={handleStart}
        >
          <Feather name="play" size={22} color="#ffffff" />
          <Text style={styles.startBtnText}>Start {selectedDiff.label}</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 14 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  typeName: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  typeDesc: { fontSize: 11, textAlign: "center", lineHeight: 16 },
  checkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  diffList: { gap: 8 },
  diffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  diffIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  diffInfo: { flex: 1 },
  diffLabel: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  diffDesc: { fontSize: 12, lineHeight: 18 },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 18,
    borderRadius: 16,
    marginTop: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  startBtnText: { fontSize: 19, fontWeight: "700", color: "#ffffff" },
});
