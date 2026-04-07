import React, { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { useGame, getLevelTitle } from "@/context/GameContext";
import type { LeaderboardEntry } from "@/context/GameContext";
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

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#c97c3a", "#6366f1", "#10b981"];

export default function LeaderboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, leaderboard } = useGame();

  const [allEntries, setAllEntries] = useState<LeaderboardEntry[]>([]);
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;

  useEffect(() => {
    // Load from context + storage
    AsyncStorage.getItem("leaderboard").then((data) => {
      let entries: LeaderboardEntry[] = leaderboard || [];
      if (data) {
        try {
          const stored = JSON.parse(data) as LeaderboardEntry[];
          // Merge stored + context
          const merged = [...entries, ...stored];
          const deduped = merged.reduce((acc: LeaderboardEntry[], e) => {
            const existing = acc.find(x => x.name === e.name && x.date === e.date && x.xp === e.xp);
            if (!existing) acc.push(e);
            return acc;
          }, []);
          entries = deduped.sort((a, b) => b.xp - a.xp).slice(0, 50);
        } catch (_) {}
      }
      // Always add current player as a baseline entry if they have XP
      if (profile.xp > 0) {
        const playerEntry: LeaderboardEntry = {
          name: profile.name || "You",
          xp: profile.xp,
          wins: profile.wins,
          date: new Date().toLocaleDateString(),
          gameType: "all",
        };
        const hasPlayer = entries.some(e => e.name === playerEntry.name && e.xp === playerEntry.xp);
        if (!hasPlayer) entries = [playerEntry, ...entries].sort((a, b) => b.xp - a.xp).slice(0, 50);
      }
      setAllEntries(entries);
    });
  }, [leaderboard, profile]);

  // Generate some sample competition if empty
  const displayEntries = allEntries.length > 0 ? allEntries : generateSampleLeaderboard(profile);

  const myRank = displayEntries.findIndex(e => e.name === profile.name) + 1;

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.accent }]}>Leaderboard</Text>
      </View>

      {/* Your rank summary */}
      {profile.xp > 0 && (
        <View style={[styles.myRankCard, { backgroundColor: "rgba(201,168,76,0.12)", borderColor: colors.accent }]}>
          <View style={styles.myRankLeft}>
            <MaterialCommunityIcons name="gavel" size={20} color={colors.accent} />
            <View>
              <Text style={[styles.myRankName, { color: "#ffffff" }]}>
                {profile.name || "You"}
              </Text>
              <Text style={[styles.myRankTitle, { color: colors.accent }]}>
                {getLevelTitle(profile.xp)}
              </Text>
            </View>
          </View>
          <View style={styles.myRankRight}>
            {myRank > 0 && (
              <Text style={[styles.myRankNum, { color: colors.accent }]}>#{myRank}</Text>
            )}
            <Text style={[styles.myRankXP, { color: "#ffffff" }]}>{profile.xp.toLocaleString()} XP</Text>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          TOP PLAYERS
        </Text>

        {displayEntries.map((entry, idx) => {
          const isMe = entry.name === profile.name;
          const rankColor = idx < RANK_COLORS.length ? RANK_COLORS[idx] : colors.mutedForeground;
          const rankIcon = idx === 0 ? "trophy" : idx === 1 ? "medal" : idx === 2 ? "medal-outline" : null;
          return (
            <View
              key={`${entry.name}-${idx}`}
              style={[
                styles.entryCard,
                {
                  backgroundColor: isMe ? "rgba(201,168,76,0.15)" : "rgba(0,0,0,0.55)",
                  borderColor: isMe ? colors.accent : "rgba(255,255,255,0.08)",
                  borderWidth: isMe ? 1.5 : 1,
                },
              ]}
            >
              <View style={styles.rankWrap}>
                {rankIcon ? (
                  <MaterialCommunityIcons name={rankIcon as any} size={20} color={rankColor} />
                ) : (
                  <Text style={[styles.rankNum, { color: rankColor }]}>#{idx + 1}</Text>
                )}
              </View>
              <View style={[styles.entryAvatar, { borderColor: isMe ? colors.accent : colors.border }]}>
                <Text style={styles.entryAvatarText}>{(entry.name || "?")[0].toUpperCase()}</Text>
              </View>
              <View style={styles.entryInfo}>
                <Text style={[styles.entryName, { color: isMe ? colors.accent : "#ffffff" }]}>
                  {entry.name}{isMe ? " (You)" : ""}
                </Text>
                <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
                  {getLevelTitle(entry.xp)} · {entry.wins} wins
                </Text>
              </View>
              <Text style={[styles.entryXP, { color: isMe ? colors.accent : "#ffffff" }]}>
                {entry.xp.toLocaleString()}
              </Text>
            </View>
          );
        })}

        {displayEntries.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No scores yet. Complete a game to appear here!
            </Text>
          </View>
        )}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Leaderboard is local to this device. Win games to climb the ranks!
        </Text>
      </ScrollView>
    </View>
  );
}

function generateSampleLeaderboard(profile: any): LeaderboardEntry[] {
  const names = ["Lady Justice", "The Honourable K. Williams", "Barrister Clarke", "Counsellor Noel", "Judge Roberts", "QC Thompson", "Associate Dean"];
  const entries = names.map((name, i) => ({
    name,
    xp: Math.max(50, 1500 - i * 180 + Math.floor(Math.random() * 50)),
    wins: Math.max(1, 12 - i * 1),
    date: new Date().toLocaleDateString(),
    gameType: "spider",
  }));
  if (profile.xp > 0) {
    entries.push({ name: profile.name || "You", xp: profile.xp, wins: profile.wins, date: new Date().toLocaleDateString(), gameType: "all" });
  }
  return entries.sort((a, b) => b.xp - a.xp).slice(0, 20);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 8, gap: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  myRankCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  myRankLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  myRankRight: { alignItems: "flex-end" },
  myRankName: { fontSize: 16, fontWeight: "700" },
  myRankTitle: { fontSize: 12 },
  myRankNum: { fontSize: 20, fontWeight: "700" },
  myRankXP: { fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 8, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 2, marginBottom: 4 },
  entryCard: {
    flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, gap: 10,
  },
  rankWrap: { width: 28, alignItems: "center" },
  rankNum: { fontSize: 14, fontWeight: "700" },
  entryAvatar: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.07)",
  },
  entryAvatarText: { fontSize: 16, fontWeight: "700", color: "#ffffff" },
  entryInfo: { flex: 1 },
  entryName: { fontSize: 15, fontWeight: "700" },
  entryMeta: { fontSize: 12, marginTop: 1 },
  entryXP: { fontSize: 14, fontWeight: "700" },
  empty: { alignItems: "center", gap: 12, marginTop: 40 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  footer: { fontSize: 12, textAlign: "center", marginTop: 16 },
});
