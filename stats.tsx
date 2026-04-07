import React from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame, getLevelTitle, getXPForNextLevel } from "@/context/GameContext";

const COURTROOM_IMAGES: Record<string, any> = {
  stvincent: require("../assets/images/courtroom_stvincent.png"),
  barbados: require("../assets/images/courtroom_barbados.png"),
  grenada: require("../assets/images/courtroom_grenada.png"),
  bahamas: require("../assets/images/courtroom_bahamas.png"),
};

export default function StatsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useGame();

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const { current, next } = getXPForNextLevel(profile.xp);
  const progress = Math.min((profile.xp - current) / (next - current), 1);

  const winRate = profile.totalGames > 0
    ? Math.round((profile.wins / profile.totalGames) * 100)
    : 0;

  const topics = [
    { label: "Criminal Law", value: profile.masteredTopics.criminal, color: "#ef4444", icon: "shield" },
    { label: "Contract Law", value: profile.masteredTopics.contract, color: "#3b82f6", icon: "file-text" },
    { label: "Tort Law", value: profile.masteredTopics.tort, color: "#f59e0b", icon: "alert-triangle" },
  ];

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.78)" }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <Feather name="bar-chart-2" size={22} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.accent }]}>Statistics</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.rankCard, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.accent }]}>
          <Text style={[styles.rankTitle, { color: colors.accent }]}>{getLevelTitle(profile.xp)}</Text>
          <Text style={[styles.rankName, { color: "#ffffff" }]}>{profile.name}</Text>
          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {profile.xp} / {next} XP
          </Text>
        </View>

        <View style={styles.gridCards}>
          {[
            { label: "Total XP", value: profile.xp, color: colors.accent, icon: "star" },
            { label: "Wins", value: profile.wins, color: "#22c55e", icon: "check-circle" },
            { label: "Win Rate", value: `${winRate}%`, color: "#3b82f6", icon: "percent" },
            { label: "Day Streak", value: profile.streak, color: "#7c3aed", icon: "zap" },
            { label: "Cases Won", value: profile.casebook.length, color: "#f59e0b", icon: "book-open" },
            { label: "Games", value: profile.totalGames, color: colors.mutedForeground, icon: "layers" },
          ].map((s, i) => (
            <View key={i} style={[styles.gridCard, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.border }]}>
              <Feather name={s.icon as any} size={20} color={s.color} />
              <Text style={[styles.gridVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.gridLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>TOPIC MASTERY</Text>
          {topics.map((t, i) => (
            <View key={i} style={styles.topicRow}>
              <View style={styles.topicLeft}>
                <Feather name={t.icon as any} size={16} color={t.color} />
                <Text style={[styles.topicLabel, { color: "#ffffff" }]}>{t.label}</Text>
              </View>
              <View style={styles.topicRight}>
                <View style={[styles.topicBarBg, { backgroundColor: colors.border }]}>
                  <View style={[styles.topicBarFill, { backgroundColor: t.color, width: `${Math.min(t.value, 100)}%` }]} />
                </View>
                <Text style={[styles.topicPercent, { color: t.color }]}>{t.value}%</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.section, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>CASEBOOK</Text>
          <View style={styles.rarityRow}>
            {["common", "rare", "legendary"].map((r) => {
              const count = profile.casebook.filter((c) => c.rarity === r).length;
              const colors2 = { common: "#6b7280", rare: "#7c3aed", legendary: "#f59e0b" };
              return (
                <View key={r} style={[styles.rarityCard, { borderColor: colors2[r as keyof typeof colors2] + "50" }]}>
                  <Text style={[styles.rarityCount, { color: colors2[r as keyof typeof colors2] }]}>{count}</Text>
                  <Text style={[styles.rarityLabel, { color: colors.mutedForeground }]}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
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
    paddingBottom: 14,
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  rankCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    alignItems: "center",
  },
  rankTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 1.5 },
  rankName: { fontSize: 28, fontWeight: "700" },
  progressBg: { height: 8, width: "100%", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontSize: 12 },
  gridCards: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: {
    flex: 1,
    minWidth: "30%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  gridVal: { fontSize: 22, fontWeight: "700" },
  gridLabel: { fontSize: 11, textAlign: "center" },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topicLeft: { flexDirection: "row", alignItems: "center", gap: 8, width: 130 },
  topicLabel: { fontSize: 13, fontWeight: "600" },
  topicRight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  topicBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  topicBarFill: { height: "100%", borderRadius: 4 },
  topicPercent: { fontSize: 12, fontWeight: "700", width: 36, textAlign: "right" },
  rarityRow: { flexDirection: "row", gap: 10 },
  rarityCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    gap: 4,
  },
  rarityCount: { fontSize: 24, fontWeight: "700" },
  rarityLabel: { fontSize: 12 },
});
