import React, { useState } from "react";
import {
  Alert,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame, getLevelTitle } from "@/context/GameContext";

const COURTROOM_IMAGES: Record<string, any> = {
  stvincent: require("../assets/images/courtroom_stvincent.png"),
  barbados: require("../assets/images/courtroom_barbados.png"),
  grenada: require("../assets/images/courtroom_grenada.png"),
  bahamas: require("../assets/images/courtroom_bahamas.png"),
};

export default function ChallengeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useGame();
  const [challengeLink] = useState(`https://legalspider.app/challenge/${Date.now().toString(36)}`);

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `I challenge you to beat my score in Leah's Legal Spider Solitaire! I'm ranked "${getLevelTitle(profile.xp)}" with ${profile.xp} XP.\n\nAccept the challenge: ${challengeLink}`,
        title: "Legal Spider Challenge",
      });
    } catch (_) {}
  };

  const handleShareResults = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `🏛️ Leah's Legal Spider Solitaire\n\nPlayer: ${profile.name}\nRank: ${getLevelTitle(profile.xp)}\nXP: ${profile.xp}\nWins: ${profile.wins}\nStreak: ${profile.streak} days\nCases: ${profile.casebook.length}\n\nThink you can beat me?`,
        title: "My Legal Career Stats",
      });
    } catch (_) {}
  };

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.78)" }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="sword-cross" size={22} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.accent }]}>Challenge</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.profileCard, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.accent }]}>
          <Text style={[styles.cardLabel, { color: colors.accent }]}>YOUR STATS</Text>
          <Text style={[styles.playerName, { color: "#ffffff" }]}>{profile.name}</Text>
          <Text style={[styles.playerRank, { color: colors.accent }]}>{getLevelTitle(profile.xp)}</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: "#22c55e" }]}>{profile.xp}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>XP</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: colors.accent }]}>{profile.wins}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Wins</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statVal, { color: "#7c3aed" }]}>{profile.streak}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Streak</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="link" size={18} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>Challenge a Friend</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Send your friend a challenge link. They'll play the same case — compare scores and see who wins!
          </Text>
          <View style={[styles.linkBox, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border }]}>
            <Text style={[styles.linkText, { color: "#ffffff" }]} numberOfLines={1}>{challengeLink}</Text>
          </View>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={handleShare}
          >
            <Feather name="share-2" size={18} color={colors.background} />
            <Text style={[styles.btnText, { color: colors.background }]}>Share Challenge Link</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Feather name="bar-chart-2" size={18} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>Share Your Results</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Share your current rank, XP, and career stats with friends or on social media.
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleShareResults}
          >
            <Feather name="send" size={18} color="#ffffff" />
            <Text style={[styles.btnText, { color: "#ffffff" }]}>Share My Stats</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: "rgba(10,25,15,0.9)", borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="sword" size={18} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.accent }]}>Law Battles</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.mutedForeground }]}>
            Head-to-head legal quiz. Answer questions faster than your opponent to win.
          </Text>
          <View style={[styles.comingSoon, { backgroundColor: colors.accent + "18", borderColor: colors.accent }]}>
            <Feather name="clock" size={16} color={colors.accent} />
            <Text style={[styles.comingSoonText, { color: colors.accent }]}>Coming Soon</Text>
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
  profileCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    alignItems: "center",
  },
  cardLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  playerName: { fontSize: 24, fontWeight: "700" },
  playerRank: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
  statsRow: {
    flexDirection: "row",
    gap: 32,
    marginTop: 6,
  },
  stat: { alignItems: "center", gap: 2 },
  statVal: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, letterSpacing: 0.5 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionDesc: { fontSize: 13, lineHeight: 21 },
  linkBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  linkText: { fontSize: 13 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 15,
    borderRadius: 12,
  },
  btnText: { fontSize: 16, fontWeight: "700" },
  comingSoon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  comingSoonText: { fontSize: 13, fontWeight: "700" },
});
