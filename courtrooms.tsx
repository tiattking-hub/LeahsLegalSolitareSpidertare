import React from "react";
import {
  Image,
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
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useGame, COURTROOM_XP } from "@/context/GameContext";
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

const COURTROOMS: Array<{
  id: CourtroomId;
  name: string;
  fullName: string;
  location: string;
  desc: string;
  flag: string;
}> = [
  {
    id: "stvincent",
    name: "St. Vincent",
    fullName: "Eastern Caribbean Supreme Court",
    location: "Kingstown, St. Vincent & the Grenadines",
    desc: "Overlooking the Caribbean Sea and the hills of Kingstown, this court reflects the island's passionate commitment to justice.",
    flag: "🇻🇨",
  },
  {
    id: "barbados",
    name: "Barbados",
    fullName: "Supreme Court of Barbados",
    location: "Bridgetown, Barbados",
    desc: "The Supreme Court of Barbados sits in one of the most prosperous nations in the Caribbean, with a proud legal tradition.",
    flag: "🇧🇧",
  },
  {
    id: "grenada",
    name: "Grenada",
    fullName: "Eastern Caribbean Supreme Court, Grenada",
    location: "St. George's, Grenada",
    desc: "Set against Grenada's spice-scented hills and the Carenage harbor, this court handles matters from the Spice Isle.",
    flag: "🇬🇩",
  },
  {
    id: "bahamas",
    name: "The Bahamas",
    fullName: "Supreme Court of the Bahamas",
    location: "Nassau, The Bahamas",
    desc: "Nassau's grand court sits amidst colonial splendor and crystal-blue waters, adjudicating matters across the 700-island archipelago.",
    flag: "🇧🇸",
  },
  {
    id: "jamaica",
    name: "Jamaica",
    fullName: "Supreme Court of Jamaica",
    location: "Kingston, Jamaica",
    desc: "The Supreme Court of Jamaica has stood since 1879. Set in Kingston, it hears civil and criminal matters from across the island.",
    flag: "🇯🇲",
  },
  {
    id: "stkitts",
    name: "St. Kitts & Nevis",
    fullName: "Eastern Caribbean Supreme Court — St. Kitts",
    location: "Basseterre, St. Kitts",
    desc: "The world's smallest federation boasts a proud court with its own Supreme Court jurisdiction within the Eastern Caribbean system.",
    flag: "🇰🇳",
  },
  {
    id: "guyana",
    name: "Guyana",
    fullName: "Supreme Court of Guyana",
    location: "Georgetown, Guyana",
    desc: "The Supreme Court of Guyana draws on a unique blend of common law and Roman-Dutch legal traditions, a legacy of British and Dutch colonial rule.",
    flag: "🇬🇾",
  },
  {
    id: "england",
    name: "England",
    fullName: "High Court of Justice",
    location: "Royal Courts of Justice, London",
    desc: "The Royal Courts of Justice on the Strand — a magnificent Gothic Victorian building housing England's High Court since 1882.",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  {
    id: "houseofLords",
    name: "House of Lords",
    fullName: "Judicial Committee — House of Lords",
    location: "Westminster, London",
    desc: "The historic chamber of the House of Lords served as the UK's highest court until 2009, when the UK Supreme Court was created. Now ceremonial — but grand.",
    flag: "🇬🇧",
  },
  {
    id: "usa",
    name: "United States",
    fullName: "United States Federal District Court",
    location: "Washington D.C.",
    desc: "Federal courthouses across the US are temples of American law — marble columns, eagle crests, and the weight of the Constitution in every judgment.",
    flag: "🇺🇸",
  },
  {
    id: "japan",
    name: "Japan",
    fullName: "Supreme Court of Japan",
    location: "Tokyo, Japan",
    desc: "The Supreme Court of Japan, known as the Saiko Saibansho, is the highest court in Japan — modern, minimalist, and supremely authoritative.",
    flag: "🇯🇵",
  },
  {
    id: "australia",
    name: "Australia",
    fullName: "High Court of Australia",
    location: "Canberra, Australia",
    desc: "The High Court of Australia in Canberra is the apex court of the Australian judicial system — bold brutalist architecture, warm sandstone tones, and the kangaroo and emu crest above the bench.",
    flag: "🇦🇺",
  },
];

export default function CourtroomsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useGame();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom] ?? COURTROOM_IMAGES.stvincent;

  const handleSelect = (id: CourtroomId, locked: boolean) => {
    if (locked) return;
    updateProfile({ selectedCourtroom: id });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const unlocked = COURTROOMS.filter((c) => profile.unlockedCourtrooms.includes(c.id)).length;

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />

      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="bank" size={22} color={colors.accent} />
        <Text style={[styles.headerTitle, { color: colors.accent }]}>Courtrooms</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {unlocked} / {COURTROOMS.length} unlocked
        </Text>
      </View>

      {/* XP progress banner */}
      <View style={[styles.xpBanner, { backgroundColor: "rgba(201,168,76,0.1)", borderColor: colors.accent + "44" }]}>
        <MaterialCommunityIcons name="lightning-bolt" size={15} color={colors.accent} />
        <Text style={[styles.xpBannerText, { color: colors.mutedForeground }]}>
          You have{" "}
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{profile.xp} XP</Text>
          {" "}· Earn more XP by playing to unlock new courtrooms
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {COURTROOMS.map((c) => {
          const selected = profile.selectedCourtroom === c.id;
          const isLocked = !profile.unlockedCourtrooms.includes(c.id);
          const xpRequired = COURTROOM_XP[c.id];

          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.card,
                {
                  borderColor: selected
                    ? colors.accent
                    : isLocked
                    ? "rgba(255,255,255,0.1)"
                    : colors.border,
                  borderWidth: selected ? 2.5 : 1,
                  opacity: isLocked ? 0.72 : 1,
                },
              ]}
              onPress={() => handleSelect(c.id, isLocked)}
              activeOpacity={isLocked ? 0.6 : 0.82}
            >
              {/* Courtroom thumbnail */}
              <View style={styles.imageWrap}>
                <Image
                  source={COURTROOM_IMAGES[c.id]}
                  style={[styles.cardImage, isLocked && styles.cardImageLocked]}
                  resizeMode="cover"
                />
                {isLocked && (
                  <View style={styles.lockOverlay}>
                    <View style={[styles.lockBadge, { backgroundColor: "rgba(0,0,0,0.8)", borderColor: colors.accent + "66" }]}>
                      <MaterialCommunityIcons name="lock" size={18} color={colors.accent} />
                      <Text style={[styles.lockXP, { color: colors.accent }]}>{xpRequired.toLocaleString()} XP</Text>
                    </View>
                  </View>
                )}
                {selected && !isLocked && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.accent }]}>
                    <Feather name="check" size={13} color="#000" />
                    <Text style={[styles.selectedText, { color: "#000" }]}>Active</Text>
                  </View>
                )}
              </View>

              <View style={[styles.cardInfo, { backgroundColor: "rgba(0,0,0,0.9)" }]}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.flagEmoji}>{c.flag}</Text>
                  <Text style={[styles.cardName, { color: isLocked ? "#888888" : colors.accent }]}>{c.name}</Text>
                  {isLocked && (
                    <View style={[styles.xpPill, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]}>
                      <MaterialCommunityIcons name="lock-outline" size={10} color={colors.accent} />
                      <Text style={[styles.xpPillText, { color: colors.accent }]}>
                        {xpRequired.toLocaleString()} XP
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardFull, { color: isLocked ? "#555555" : "#ffffff" }]}>{c.fullName}</Text>
                <Text style={[styles.cardLocation, { color: isLocked ? "#444444" : colors.mutedForeground }]}>{c.location}</Text>
                {!isLocked && (
                  <Text style={[styles.cardDesc, { color: "#cccccc" }]} numberOfLines={2}>{c.desc}</Text>
                )}
                {isLocked && (
                  <Text style={[styles.cardDesc, { color: "#555555" }]} numberOfLines={1}>
                    Earn {(xpRequired - profile.xp).toLocaleString()} more XP to unlock
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 22, fontWeight: "700" },
  headerCount: { fontSize: 13, marginLeft: "auto" },
  xpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  xpBannerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(10,20,15,0.9)",
  },
  imageWrap: { position: "relative" },
  cardImage: { width: "100%", height: 148 },
  cardImageLocked: { opacity: 0.4 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  lockXP: { fontSize: 15, fontWeight: "700" },
  selectedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  selectedText: { fontSize: 12, fontWeight: "700" },
  cardInfo: { padding: 14, gap: 3 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  flagEmoji: { fontSize: 20 },
  cardName: { fontSize: 18, fontWeight: "700" },
  xpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  xpPillText: { fontSize: 10, fontWeight: "700" },
  cardFull: { fontSize: 13, fontWeight: "600" },
  cardLocation: { fontSize: 12 },
  cardDesc: { fontSize: 13, lineHeight: 20, marginTop: 3 },
});
