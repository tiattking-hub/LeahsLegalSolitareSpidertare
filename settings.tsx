import React, { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Animated,
  ImageBackground,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useGame();

  const [nameInput, setNameInput]   = useState(profile.name);
  const [nameSaved, setNameSaved]   = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const isLight = profile.theme === "light";
  const courtroomBg = COURTROOM_IMAGES[profile.selectedCourtroom as CourtroomId] ?? COURTROOM_IMAGES.stvincent;
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const fg = isLight ? colors.foreground : "#ffffff";
  const cardBg = colors.sectionBg;
  const borderCol = isLight ? colors.border : "rgba(255,255,255,0.1)";

  const handleSaveName = () => {
    if (nameInput.trim().length >= 2) {
      updateProfile({ name: nameInput.trim() });
      setNameSaved(true);
      if (profile.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setNameSaved(false), 2200);
    }
  };

  const toggleTheme = () => {
    updateProfile({ theme: profile.theme === "dark" ? "light" : "dark" });
    if (profile.hapticsEnabled) Haptics.selectionAsync();
  };

  const toggleSound = () => {
    updateProfile({ soundEnabled: !profile.soundEnabled });
    if (profile.hapticsEnabled) Haptics.selectionAsync();
  };

  const toggleHaptics = () => {
    updateProfile({ hapticsEnabled: !profile.hapticsEnabled });
    if (profile.hapticsEnabled) Haptics.selectionAsync();
  };

  const handleSubmitFeedback = async () => {
    if (starRating === 0 && !feedbackText.trim()) return;
    const entry = {
      rating: starRating,
      comment: feedbackText.trim(),
      date: new Date().toISOString(),
      player: profile.name || "Anonymous",
      xp: profile.xp,
    };
    const existing = await AsyncStorage.getItem("user_feedback_log");
    const log = existing ? JSON.parse(existing) : [];
    log.push(entry);
    await AsyncStorage.setItem("user_feedback_log", JSON.stringify(log));
    if (profile.hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackSent(false);
      setStarRating(0);
      setFeedbackText("");
    }, 3000);
  };

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {children}
    </View>
  );

  const SettingRow = ({
    icon, label, desc, children,
  }: { icon: string; label: string; desc?: string; children: React.ReactNode }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <MaterialCommunityIcons name={icon as any} size={20} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: fg }]}>{label}</Text>
          {desc ? <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>{desc}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      <ImageBackground source={courtroomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.accent + "33" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={24} color={colors.accent} />
        </TouchableOpacity>
        <MaterialCommunityIcons name="cog" size={20} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.accent, fontFamily: "Georgia" }]}>Settings</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {getLevelTitle(profile.xp)} · {profile.xp.toLocaleString()} XP
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Profile ── */}
        <Text style={[styles.groupLabel, { color: colors.accent }]}>PROFILE</Text>
        <SectionCard>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Your Name</Text>
          <View style={styles.nameRow}>
            <TextInput
              style={[styles.nameInput, { color: fg, borderColor: colors.border, backgroundColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)" }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: nameSaved ? "#22c55e" : colors.accent }]}
              onPress={handleSaveName}
            >
              <Feather name={nameSaved ? "check" : "save"} size={18} color={nameSaved ? "#fff" : colors.accentForeground} />
            </TouchableOpacity>
          </View>
          {nameSaved && (
            <Text style={[styles.savedMsg, { color: "#22c55e" }]}>Name saved!</Text>
          )}
        </SectionCard>

        {/* ── Appearance ── */}
        <Text style={[styles.groupLabel, { color: colors.accent }]}>APPEARANCE</Text>
        <SectionCard>
          <SettingRow
            icon={profile.theme === "dark" ? "weather-night" : "white-balance-sunny"}
            label={profile.theme === "dark" ? "Dark Mode" : "Light Mode"}
            desc={profile.theme === "dark" ? "Deep courtroom ambiance" : "Bright parchment feel"}
          >
            <Switch
              value={profile.theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{ false: "#22c55e66", true: colors.accent + "99" }}
              thumbColor="#ffffff"
            />
          </SettingRow>
        </SectionCard>

        {/* ── Sound & Effects ── */}
        <Text style={[styles.groupLabel, { color: colors.accent }]}>SOUND & EFFECTS</Text>
        <SectionCard>
          <SettingRow
            icon="volume-high"
            label="Sound Effects"
            desc="Card deals, completions, and wins"
          >
            <Switch
              value={profile.soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: colors.border, true: colors.accent + "99" }}
              thumbColor="#ffffff"
            />
          </SettingRow>
          <View style={[styles.rowDivider, { backgroundColor: borderCol }]} />
          <SettingRow
            icon="vibrate"
            label="Haptic Feedback"
            desc="Tactile feedback on card moves"
          >
            <Switch
              value={profile.hapticsEnabled}
              onValueChange={toggleHaptics}
              trackColor={{ false: colors.border, true: colors.accent + "99" }}
              thumbColor="#ffffff"
            />
          </SettingRow>
        </SectionCard>

        {/* ── Game Progress ── */}
        <Text style={[styles.groupLabel, { color: colors.accent }]}>PROGRESS</Text>
        <SectionCard>
          <View style={styles.statGrid}>
            {[
              { val: profile.xp.toLocaleString(), lbl: "Total XP",    color: colors.accent },
              { val: profile.wins,                 lbl: "Wins",        color: "#22c55e" },
              { val: profile.streak,               lbl: "Day Streak",  color: "#a78bfa" },
              { val: profile.casebook.length,      lbl: "Cases Filed", color: "#3b82f6" },
              { val: profile.unlockedCourtrooms.length, lbl: "Courtrooms",  color: "#f59e0b" },
              { val: profile.totalGames,           lbl: "Games Played",color: "#f87171" },
            ].map((s) => (
              <View key={s.lbl} style={[styles.statCard, { backgroundColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)", borderColor: borderCol }]}>
                <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{s.lbl}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* ── Feedback ── */}
        <Text style={[styles.groupLabel, { color: colors.accent }]}>FEEDBACK</Text>
        <SectionCard>
          {feedbackSent ? (
            <View style={styles.feedbackThanks}>
              <MaterialCommunityIcons name="check-circle" size={36} color="#22c55e" />
              <Text style={[styles.feedbackThanksTitle, { color: fg, fontFamily: "Georgia" }]}>Thank you!</Text>
              <Text style={[styles.feedbackThanksSub, { color: colors.mutedForeground }]}>
                Your feedback has been recorded and will help improve the game.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.feedbackTitle, { color: fg }]}>Rate Your Experience</Text>
              <Text style={[styles.feedbackSub, { color: colors.mutedForeground }]}>
                How are you enjoying Leah's Legal Spider Solitaire?
              </Text>

              {/* Star rating */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      setStarRating(star);
                      if (profile.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={styles.starBtn}
                  >
                    <MaterialCommunityIcons
                      name={star <= starRating ? "star" : "star-outline"}
                      size={36}
                      color={star <= starRating ? colors.accent : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {starRating > 0 && (
                <Text style={[styles.ratingLabel, { color: colors.accent }]}>
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent!"][starRating]}
                </Text>
              )}

              {/* Comment box */}
              <TextInput
                style={[styles.feedbackInput, { color: fg, borderColor: colors.border, backgroundColor: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)" }]}
                value={feedbackText}
                onChangeText={setFeedbackText}
                placeholder="Share a bug, suggestion, or comment…"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Submit */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: (starRating > 0 || feedbackText.trim()) ? colors.accent : colors.border,
                    opacity: (starRating > 0 || feedbackText.trim()) ? 1 : 0.5,
                  },
                ]}
                onPress={handleSubmitFeedback}
                disabled={starRating === 0 && !feedbackText.trim()}
              >
                <Feather name="send" size={16} color={colors.accentForeground} />
                <Text style={[styles.submitBtnText, { color: colors.accentForeground }]}>Submit Feedback</Text>
              </TouchableOpacity>
            </>
          )}
        </SectionCard>

        {/* ── About ── */}
        <Text style={[styles.groupLabel, { color: colors.accent }]}>ABOUT</Text>
        <SectionCard>
          <View style={styles.aboutHeader}>
            <View style={[styles.aboutIcon, { borderColor: colors.accent, backgroundColor: colors.accent + "15" }]}>
              <MaterialCommunityIcons name="scale-balance" size={28} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aboutTitle, { color: fg, fontFamily: "Georgia" }]}>Leah's Legal Spider Solitaire</Text>
              <Text style={[styles.aboutVer, { color: colors.mutedForeground }]}>Version 1.0.0 · Caribbean Legal Edition</Text>
            </View>
          </View>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>
            A legal education game combining Spider Solitaire with Caribbean and international law. Master criminal, contract, tort, and constitutional law while climbing the courtroom ranks from Law Student to Chief Justice.
          </Text>
          <View style={[styles.rowDivider, { backgroundColor: borderCol }]} />
          <TouchableOpacity
            style={styles.aboutLink}
            onPress={() => Linking.openURL("mailto:feedback@leahslegal.app?subject=Legal Spider Solitaire Feedback")}
          >
            <Feather name="mail" size={16} color={colors.accent} />
            <Text style={[styles.aboutLinkText, { color: colors.accent }]}>Email us feedback</Text>
          </TouchableOpacity>
        </SectionCard>

        <View style={{ height: 30 }} />
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
    borderBottomWidth: 1,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: "700", letterSpacing: 0.5 },
  headerSub: { fontSize: 12, marginTop: 1, fontStyle: "italic" },

  content: { padding: 16, gap: 8, paddingBottom: 40 },

  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 4,
  },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  rowDivider: { height: 1, marginHorizontal: -4 },

  fieldLabel: { fontSize: 12, marginBottom: -6 },
  nameRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  nameInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: "Georgia",
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  savedMsg: { fontSize: 12, fontWeight: "600", marginTop: -6 },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingDesc: { fontSize: 11, marginTop: 2 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1,
    minWidth: "30%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    gap: 3,
  },
  statVal: { fontSize: 20, fontWeight: "700", fontFamily: "Georgia" },
  statLbl: { fontSize: 10, textAlign: "center" },

  // Feedback
  feedbackTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Georgia" },
  feedbackSub: { fontSize: 13, lineHeight: 20, marginTop: -6 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 4 },
  starBtn: { padding: 4 },
  ratingLabel: { textAlign: "center", fontSize: 14, fontWeight: "700", fontFamily: "Georgia", marginTop: -6 },
  feedbackInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    lineHeight: 22,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700" },

  feedbackThanks: { alignItems: "center", gap: 10, paddingVertical: 10 },
  feedbackThanksTitle: { fontSize: 20, fontWeight: "700" },
  feedbackThanksSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },

  // About
  aboutHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
  aboutIcon: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  aboutTitle: { fontSize: 15, fontWeight: "700" },
  aboutVer: { fontSize: 12, marginTop: 2 },
  aboutText: { fontSize: 13, lineHeight: 22 },
  aboutLink: { flexDirection: "row", alignItems: "center", gap: 8 },
  aboutLinkText: { fontSize: 14, fontWeight: "600" },
});
