import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { LegalCase } from "@/utils/legalCases";
import * as Haptics from "expo-haptics";

interface Props {
  visible: boolean;
  legalCase: LegalCase | null;
  onCorrect: () => void;
  onWrong: () => void;
  onClose: () => void;
  isHintQuestion?: boolean;
}

export function LegalQuestionModal({ visible, legalCase, onCorrect, onWrong, onClose }: Props) {
  const colors = useColors();
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showELI5, setShowELI5] = useState(false);
  const [answered, setAnswered] = useState(false);

  if (!legalCase) return null;

  const isCorrect = answered && selected === legalCase.correctIndex;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    setShowExplanation(true);
    if (idx === legalCase.correctIndex) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const resetState = () => {
    setSelected(null);
    setShowExplanation(false);
    setShowELI5(false);
    setAnswered(false);
  };

  const handleContinue = () => {
    if (isCorrect) {
      resetState();
      onCorrect();
    } else {
      resetState();
      onWrong();
      onClose();
    }
  };

  const rarityColor =
    legalCase.rarity === "legendary"
      ? "#f59e0b"
      : legalCase.rarity === "rare"
      ? "#7c3aed"
      : colors.mutedForeground;

  const categoryColors: Record<string, string> = {
    criminal: "#ef4444",
    contract: "#3b82f6",
    tort: "#f59e0b",
    constitutional: "#10b981",
  };
  const catColor = categoryColors[legalCase.category] ?? colors.accent;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleContinue}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={[styles.rarityBadge, { borderColor: rarityColor }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {legalCase.rarity.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: catColor + "22" }]}>
              <Text style={[styles.categoryText, { color: catColor }]}>
                {legalCase.category.toUpperCase()} LAW
              </Text>
            </View>
            {answered && (
              <View style={[styles.resultBadge, { backgroundColor: isCorrect ? "#22c55e22" : "#ef444422" }]}>
                <Feather name={isCorrect ? "check-circle" : "x-circle"} size={14} color={isCorrect ? "#22c55e" : "#ef4444"} />
                <Text style={[styles.resultText, { color: isCorrect ? "#22c55e" : "#ef4444" }]}>
                  {isCorrect ? "Correct!" : "Wrong"}
                </Text>
              </View>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: "85%" }}>
            <Text style={[styles.caseTitle, { color: colors.accent }]}>{legalCase.title}</Text>
            <Text style={[styles.facts, { color: colors.foreground }]}>{legalCase.facts}</Text>

            <View style={[styles.questionBox, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}>
              <Text style={[styles.question, { color: colors.primary }]}>{legalCase.question}</Text>
            </View>

            <View style={styles.options}>
              {legalCase.options.map((opt, idx) => {
                let bg = colors.secondary;
                let border = colors.border;
                let textColor = colors.foreground;

                if (answered) {
                  if (idx === legalCase.correctIndex) {
                    bg = "#16653433";
                    border = "#22c55e";
                    textColor = "#22c55e";
                  } else if (idx === selected) {
                    bg = "#ef444422";
                    border = "#ef4444";
                    textColor = "#ef4444";
                  } else {
                    bg = "transparent";
                    border = colors.border;
                    textColor = colors.mutedForeground;
                  }
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                    onPress={() => handleSelect(idx)}
                    disabled={answered}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.optionLetter, { borderColor: border }]}>
                      <Text style={[styles.optionLetterText, { color: textColor }]}>
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                    {answered && idx === legalCase.correctIndex && (
                      <Feather name="check-circle" size={18} color="#22c55e" />
                    )}
                    {answered && idx === selected && idx !== legalCase.correctIndex && (
                      <Feather name="x-circle" size={18} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {showExplanation && (
              <View style={[styles.explanation, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.explainTitle, { color: isCorrect ? "#22c55e" : "#ef4444" }]}>
                  {isCorrect ? "Well done! Correct!" : "Not quite — see explanation below"}
                </Text>
                <Text style={[styles.explainText, { color: colors.foreground }]}>{legalCase.explanation}</Text>
                <View style={[styles.principleBox, { borderColor: colors.accent }]}>
                  <Text style={[styles.principleLabel, { color: colors.mutedForeground }]}>LEGAL PRINCIPLE</Text>
                  <Text style={[styles.principleText, { color: colors.accent }]}>{legalCase.principle}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.eli5Btn, { borderColor: colors.primary }]}
                  onPress={() => setShowELI5(!showELI5)}
                >
                  <Feather name="help-circle" size={16} color={colors.primary} />
                  <Text style={[styles.eli5BtnText, { color: colors.primary }]}>
                    {showELI5 ? "Hide simple explanation" : "Explain like I'm 5"}
                  </Text>
                </TouchableOpacity>

                {showELI5 && (
                  <View style={[styles.eli5Box, { backgroundColor: colors.primary + "15" }]}>
                    <Text style={[styles.eli5Text, { color: colors.foreground }]}>{legalCase.eli5}</Text>
                  </View>
                )}
              </View>
            )}

            {answered && (
              <TouchableOpacity
                style={[styles.continueBtn, { backgroundColor: isCorrect ? "#22c55e" : colors.primary }]}
                onPress={handleContinue}
              >
                <Text style={[styles.continueBtnText, { color: "#fff" }]}>
                  {isCorrect ? "Continue — Collect XP" : "Continue"}
                </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
    flexWrap: "wrap",
  },
  rarityBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rarityText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: "auto",
  },
  resultText: { fontSize: 11, fontWeight: "700" },
  caseTitle: { fontSize: 19, fontWeight: "700", marginBottom: 10, fontStyle: "italic" },
  facts: { fontSize: 14, lineHeight: 22, marginBottom: 14, opacity: 0.88 },
  questionBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  question: { fontSize: 15, fontWeight: "600" },
  options: { gap: 9, marginBottom: 14 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionLetterText: { fontSize: 13, fontWeight: "700" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  explanation: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
  },
  explainTitle: { fontSize: 17, fontWeight: "700" },
  explainText: { fontSize: 14, lineHeight: 22 },
  principleBox: { borderLeftWidth: 3, paddingLeft: 12, gap: 4 },
  principleLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  principleText: { fontSize: 13, fontWeight: "600", fontStyle: "italic" },
  eli5Btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  eli5BtnText: { fontSize: 13, fontWeight: "600" },
  eli5Box: { padding: 12, borderRadius: 8 },
  eli5Text: { fontSize: 14, lineHeight: 22, fontStyle: "italic" },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 4,
  },
  continueBtnText: { fontSize: 16, fontWeight: "700" },
});
