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
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useGame, getLevelTitle, getXPForNextLevel } from "@/context/GameContext";
import { STATIC_CASES } from "@/utils/legalCases";
import { LegalQuestionModal } from "@/components/LegalQuestionModal";

const COURTROOM_IMAGES: Record<string, any> = {
  stvincent: require("../assets/images/courtroom_stvincent.png"),
  barbados: require("../assets/images/courtroom_barbados.png"),
  grenada: require("../assets/images/courtroom_grenada.png"),
  bahamas: require("../assets/images/courtroom_bahamas.png"),
};

const CAREER_MILESTONES = [
  { title: "Law Student", xp: 0, desc: "Your journey begins. Study the basics of law.", icon: "school" },
  { title: "Junior Associate", xp: 200, desc: "First cases. Small civil matters.", icon: "briefcase" },
  { title: "Associate", xp: 600, desc: "Handle contract disputes and minor criminal cases.", icon: "briefcase" },
  { title: "Senior Associate", xp: 1200, desc: "Complex torts and multi-party litigation.", icon: "award" },
  { title: "Senior Counsel", xp: 2000, desc: "Major criminal trials. Lead your team.", icon: "award" },
  { title: "Barrister", xp: 3500, desc: "Argue in the High Court. Your reputation precedes you.", icon: "gavel" },
  { title: "QC / KC", xp: 5500, desc: "Queen's / King's Counsel. Elite status.", icon: "star" },
  { title: "High Court Judge", xp: 8000, desc: "Preside over the most important cases.", icon: "gavel" },
  { title: "Chief Justice", xp: 12000, desc: "The highest judicial office. You've made it.", icon: "star" },
];

export default function CareerScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, addXP } = useGame();
  const [activeCase, setActiveCase] = useState<typeof STATIC_CASES[0] | null>(null);
  const [questResult, setQuestResult] = useState<"correct" | "wrong" | null>(null);

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const { current, next } = getXPForNextLevel(profile.xp);
  const progress = (profile.xp - current) / (next - current);
  const currentTitle = getLevelTitle(profile.xp);

  const handleTakeCase = () => {
    const randomCase = STATIC_CASES[Math.floor(Math.random() * STATIC_CASES.length)];
    setActiveCase(randomCase);
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.75)" }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="gavel" size={22} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.accent }]}>Career Mode</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.profileCard, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.accent }]}>
          <Text style={[styles.profileTitle, { color: colors.accent }]}>{currentTitle}</Text>
          <Text style={[styles.profileName, { color: "#ffffff" }]}>{profile.name}</Text>
          <Text style={[styles.xpText, { color: colors.mutedForeground }]}>{profile.xp} XP total</Text>

          <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
          <Text style={[styles.xpRemain, { color: colors.mutedForeground }]}>
            {next - profile.xp} XP to next rank
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: "#22c55e" }]}>{profile.wins}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.accent }]}>{profile.totalGames}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cases</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: "#7c3aed" }]}>{profile.streak}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Streak</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.takeCaseBtn, { backgroundColor: colors.accent }]}
          onPress={handleTakeCase}
        >
          <MaterialCommunityIcons name="gavel" size={20} color={colors.background} />
          <Text style={[styles.takeCaseBtnText, { color: colors.background }]}>Take a Case</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: colors.accent }]}>Career Path</Text>

        {CAREER_MILESTONES.map((m, idx) => {
          const achieved = profile.xp >= m.xp;
          const isCurrent = currentTitle === m.title;
          return (
            <View
              key={idx}
              style={[
                styles.milestone,
                {
                  backgroundColor: isCurrent
                    ? "rgba(201,168,76,0.18)"
                    : achieved
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(0,0,0,0.5)",
                  borderColor: isCurrent ? colors.accent : achieved ? "#22c55e50" : colors.border,
                  borderWidth: isCurrent ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.milestoneIconWrapper, { backgroundColor: achieved ? colors.accent : colors.border }]}>
                <Feather name={m.icon as any} size={18} color={achieved ? colors.background : colors.mutedForeground} />
              </View>
              <View style={styles.milestoneInfo}>
                <Text style={[styles.milestoneTitle, { color: isCurrent ? colors.accent : achieved ? "#22c55e" : colors.mutedForeground }]}>
                  {m.title}
                </Text>
                <Text style={[styles.milestoneDesc, { color: "#ffffff80" }]}>{m.desc}</Text>
              </View>
              <Text style={[styles.milestoneXP, { color: achieved ? "#22c55e" : colors.mutedForeground }]}>
                {m.xp === 0 ? "Start" : `${m.xp} XP`}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <LegalQuestionModal
        visible={activeCase !== null}
        legalCase={activeCase}
        onCorrect={() => { addXP(50); setActiveCase(null); setQuestResult("correct"); }}
        onWrong={() => { setActiveCase(null); setQuestResult("wrong"); }}
        onClose={() => setActiveCase(null)}
      />
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
  profileCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  profileTitle: { fontSize: 14, fontWeight: "700", letterSpacing: 1.5 },
  profileName: { fontSize: 26, fontWeight: "700" },
  xpText: { fontSize: 13 },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  xpRemain: { fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 6,
  },
  stat: { alignItems: "center", gap: 2 },
  statVal: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, letterSpacing: 0.5 },
  takeCaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
  },
  takeCaseBtnText: { fontSize: 17, fontWeight: "700" },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  milestone: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  milestoneIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneInfo: { flex: 1, gap: 3 },
  milestoneTitle: { fontSize: 14, fontWeight: "700" },
  milestoneDesc: { fontSize: 12, lineHeight: 18 },
  milestoneXP: { fontSize: 12, fontWeight: "600" },
});
