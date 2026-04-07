import React, { useState } from "react";
import {
  FlatList,
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
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useGame, type CompletedCase } from "@/context/GameContext";
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

const RARITY_CONFIG = {
  common:    { color: "#94a3b8", label: "COMMON",    icon: "circle-outline" as const },
  rare:      { color: "#818cf8", label: "RARE",      icon: "star-outline" as const },
  legendary: { color: "#f59e0b", label: "LEGENDARY", icon: "crown" as const },
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  criminal:       { color: "#ef4444", icon: "handcuffs",         label: "Criminal" },
  contract:       { color: "#3b82f6", icon: "file-sign",          label: "Contract" },
  tort:           { color: "#f59e0b", icon: "scale-balance",      label: "Tort" },
  constitutional: { color: "#10b981", icon: "bank",               label: "Constitutional" },
};

const FILTERS = [
  { key: "all",           label: "All Cases",     icon: "book-open-variant" },
  { key: "criminal",      label: "Criminal",      icon: "handcuffs" },
  { key: "contract",      label: "Contract",      icon: "file-sign" },
  { key: "tort",          label: "Tort",          icon: "scale-balance" },
  { key: "constitutional",label: "Constitutional", icon: "bank" },
  { key: "legendary",     label: "Legendary",     icon: "crown" },
  { key: "rare",          label: "Rare",          icon: "star-outline" },
];

export default function CasebookScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useGame();
  const [filter, setFilter] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<CompletedCase | null>(null);

  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const cases = profile.casebook.filter((c) => {
    if (filter === "all") return true;
    if (filter === "legendary" || filter === "rare") return c.rarity === filter;
    return c.category === filter;
  });

  // ─── Case Detail View ───────────────────────────────────────────────────────
  if (selectedCase) {
    const rarity  = RARITY_CONFIG[selectedCase.rarity];
    const cat     = CATEGORY_CONFIG[selectedCase.category] ?? CATEGORY_CONFIG.criminal;
    const caseNum = String(profile.casebook.findIndex((c) => c.id === selectedCase.id) + 1).padStart(3, "0");

    return (
      <View style={styles.container}>
        <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(0,0,0,0.88)", "rgba(5,15,10,0.92)", "rgba(0,0,0,0.88)"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.detailScroll, { paddingTop: topPad + 12 }]}
        >
          <TouchableOpacity onPress={() => setSelectedCase(null)} style={styles.backRow}>
            <Feather name="chevron-left" size={20} color={colors.accent} />
            <Text style={[styles.backText, { color: colors.accent }]}>Casebook</Text>
          </TouchableOpacity>

          {/* ── Case file header ── */}
          <View style={[styles.fileHeader, { borderColor: rarity.color + "66", backgroundColor: "rgba(5,20,12,0.96)" }]}>
            {/* Top stamp row */}
            <View style={styles.fileStampRow}>
              <View style={[styles.caseNumBadge, { backgroundColor: rarity.color + "20", borderColor: rarity.color + "55" }]}>
                <Text style={[styles.caseNumText, { color: rarity.color }]}>CASE #{caseNum}</Text>
              </View>
              <View style={[styles.rarityStamp, { borderColor: rarity.color }]}>
                <MaterialCommunityIcons name={rarity.icon} size={13} color={rarity.color} />
                <Text style={[styles.rarityStampText, { color: rarity.color }]}>{rarity.label}</Text>
              </View>
            </View>

            {/* Court divider */}
            <View style={[styles.courtDivider, { backgroundColor: rarity.color + "33" }]} />

            {/* Category */}
            <View style={styles.catRow}>
              <MaterialCommunityIcons name={cat.icon as any} size={16} color={cat.color} />
              <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label.toUpperCase()} LAW</Text>
            </View>

            {/* Case title */}
            <Text style={[styles.detailTitle, { color: "#f5f0e8" }]}>{selectedCase.title}</Text>
            <Text style={[styles.detailDate, { color: colors.mutedForeground }]}>Filed: {selectedCase.date}</Text>

            {/* Gold separator */}
            <View style={[styles.goldSep, { backgroundColor: colors.accent + "44" }]} />

            {/* Facts */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="file-text" size={13} color={colors.mutedForeground} />
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>STATEMENT OF FACTS</Text>
              </View>
              <Text style={[styles.factsText, { color: "#ddd8cc" }]}>{selectedCase.facts}</Text>
            </View>

            <View style={[styles.goldSep, { backgroundColor: colors.accent + "33" }]} />

            {/* Outcome */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="gavel" size={13} color="#22c55e" />
                <Text style={[styles.sectionLabel, { color: "#22c55e" }]}>JUDGMENT</Text>
              </View>
              <View style={[styles.judgmentBox, { backgroundColor: "#22c55e11", borderColor: "#22c55e33" }]}>
                <Text style={[styles.judgmentText, { color: "#22c55e" }]}>{selectedCase.outcome}</Text>
              </View>
            </View>

            {/* Legal Principle */}
            <View style={[styles.principleBlock, { borderColor: colors.accent + "55", backgroundColor: colors.accent + "0a" }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="scale-balance" size={13} color={colors.accent} />
                <Text style={[styles.sectionLabel, { color: colors.accent }]}>LEGAL PRINCIPLE</Text>
              </View>
              <Text style={[styles.principleText, { color: "#f5f0e8" }]}>{selectedCase.principle}</Text>
            </View>

            {/* Footer seal */}
            <View style={styles.sealRow}>
              <View style={[styles.seal, { borderColor: rarity.color + "55" }]}>
                <MaterialCommunityIcons name="shield-check" size={18} color={rarity.color + "88"} />
                <Text style={[styles.sealText, { color: rarity.color + "88" }]}>VERIFIED CASE</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Case list ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={["rgba(0,0,0,0.85)", "rgba(4,14,8,0.80)", "rgba(0,0,0,0.88)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="notebook-multiple" size={20} color={colors.accent} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.accent }]}>Casebook</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Legal Archive & Precedent Record</Text>
          </View>
        </View>
        <View style={[styles.countBadge, { backgroundColor: colors.accent + "22", borderColor: colors.accent + "55" }]}>
          <Text style={[styles.countText, { color: colors.accent }]}>{profile.casebook.length}</Text>
        </View>
      </View>

      {/* Gold divider */}
      <View style={[styles.headerDivider, { backgroundColor: colors.accent + "33" }]} />

      {/* Filters */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.key}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? colors.accent : "rgba(0,0,0,0.55)",
                  borderColor: active ? colors.accent : "rgba(255,255,255,0.15)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon as any}
                size={13}
                color={active ? "#000" : "#aaa"}
              />
              <Text style={[styles.filterText, { color: active ? "#000" : "#ccc" }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {cases.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { borderColor: colors.accent + "33" }]}>
            <MaterialCommunityIcons name="book-open-page-variant" size={40} color={colors.accent + "66"} />
          </View>
          <Text style={[styles.emptyTitle, { color: "#f5f0e8", fontFamily: "Georgia" }]}>
            No Cases Filed Yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Win games to earn cases for your legal archive
          </Text>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.caseList}
          renderItem={({ item, index }) => {
            const rarity = RARITY_CONFIG[item.rarity];
            const cat    = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.criminal;
            const caseNum = String(profile.casebook.findIndex((c) => c.id === item.id) + 1).padStart(3, "0");
            return (
              <TouchableOpacity
                style={[styles.caseCard, { borderColor: rarity.color + "55" }]}
                onPress={() => setSelectedCase(item)}
                activeOpacity={0.82}
              >
                {/* Left rarity accent bar */}
                <View style={[styles.rarityBar, { backgroundColor: rarity.color }]} />

                <View style={styles.caseCardInner}>
                  {/* Top row: case number + rarity + category */}
                  <View style={styles.caseCardTopRow}>
                    <Text style={[styles.caseCardNum, { color: colors.mutedForeground }]}>#{caseNum}</Text>
                    <View style={styles.caseCardBadges}>
                      <View style={[styles.catPill, { backgroundColor: cat.color + "22", borderColor: cat.color + "44" }]}>
                        <MaterialCommunityIcons name={cat.icon as any} size={10} color={cat.color} />
                        <Text style={[styles.catPillText, { color: cat.color }]}>{cat.label.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.rarityPill, { borderColor: rarity.color + "66" }]}>
                        <MaterialCommunityIcons name={rarity.icon} size={10} color={rarity.color} />
                      </View>
                    </View>
                  </View>

                  {/* Case title */}
                  <Text style={styles.caseCardTitle} numberOfLines={2}>{item.title}</Text>

                  {/* Bottom: outcome + date + arrow */}
                  <View style={styles.caseCardBottom}>
                    <View style={[styles.outcomePill, { backgroundColor: "#22c55e15", borderColor: "#22c55e33" }]}>
                      <Feather name="check-circle" size={10} color="#22c55e" />
                      <Text style={[styles.outcomeText, { color: "#22c55e" }]} numberOfLines={1}>
                        {item.outcome}
                      </Text>
                    </View>
                    <Text style={[styles.caseDate, { color: colors.mutedForeground }]}>{item.date}</Text>
                    <Feather name="chevron-right" size={14} color={colors.accent + "77"} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { padding: 6 },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Georgia",
    letterSpacing: 0.4,
  },
  headerSub: { fontSize: 11, letterSpacing: 0.3, marginTop: 1 },
  countBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { fontSize: 14, fontWeight: "700" },
  headerDivider: { height: 1, marginHorizontal: 16, marginBottom: 10 },

  // ─── Filters ──────────────────────────────────────────────────────────────
  filterList: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  filterText: { fontSize: 12, fontWeight: "600" },

  // ─── Case list ─────────────────────────────────────────────────────────────
  caseList: { paddingHorizontal: 14, gap: 10, paddingBottom: 30 },
  caseCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(5,18,10,0.92)",
  },
  rarityBar: { width: 4 },
  caseCardInner: { flex: 1, padding: 12, gap: 6 },
  caseCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caseCardNum: { fontSize: 11, fontWeight: "600", fontFamily: "Georgia", letterSpacing: 0.5 },
  caseCardBadges: { flexDirection: "row", alignItems: "center", gap: 6 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  catPillText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  rarityPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  caseCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#f5f0e8",
    fontFamily: "Georgia",
    fontStyle: "italic",
    lineHeight: 21,
  },
  caseCardBottom: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  outcomePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  outcomeText: { fontSize: 11, fontWeight: "600", flex: 1 },
  caseDate: { fontSize: 10 },

  // ─── Empty state ─────────────────────────────────────────────────────────
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },

  // ─── Detail view ─────────────────────────────────────────────────────────
  detailScroll: { paddingHorizontal: 16, paddingBottom: 40 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: "600", fontFamily: "Georgia" },
  fileHeader: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fileStampRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caseNumBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  caseNumText: { fontSize: 11, fontWeight: "700", fontFamily: "Georgia", letterSpacing: 1.5 },
  rarityStamp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  rarityStampText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  courtDivider: { height: 1 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Georgia",
    fontStyle: "italic",
    lineHeight: 30,
  },
  detailDate: { fontSize: 12, letterSpacing: 0.3 },
  goldSep: { height: 1 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
  factsText: { fontSize: 14, lineHeight: 23, fontFamily: "Georgia" },
  judgmentBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  judgmentText: { fontSize: 15, fontWeight: "700", lineHeight: 22 },
  principleBlock: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  principleText: {
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 23,
    fontFamily: "Georgia",
  },
  sealRow: { alignItems: "center", marginTop: 4 },
  seal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sealText: { fontSize: 10, fontWeight: "700", letterSpacing: 2 },
});
