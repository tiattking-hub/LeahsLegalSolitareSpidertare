import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { isRedSuit } from "@/utils/spiderSolitaire";
import type { Card } from "@/context/GameContext";

interface PlayingCardProps {
  card: Card;
  width?: number;
  height?: number;
  selected?: boolean;
  style?: object;
  backImage?: any;
}

function getLabel(value: number): string {
  if (value === 1)  return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
}

function getSuitSymbol(suit: string): string {
  switch (suit) {
    case "spades":   return "♠";
    case "hearts":   return "♥";
    case "diamonds": return "♦";
    case "clubs":    return "♣";
    default:         return "♠";
  }
}

// ─── Pip grid positions (3-col × 5-row grid) ─────────────────────────────────
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1:  [[1, 2]],
  2:  [[1, 0], [1, 4]],
  3:  [[1, 0], [1, 2], [1, 4]],
  4:  [[0, 0], [2, 0], [0, 4], [2, 4]],
  5:  [[0, 0], [2, 0], [1, 2], [0, 4], [2, 4]],
  6:  [[0, 0], [2, 0], [0, 2], [2, 2], [0, 4], [2, 4]],
  7:  [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [0, 4], [2, 4]],
  8:  [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [1, 3], [0, 4], [2, 4]],
  9:  [[0, 0], [2, 0], [0, 1], [2, 1], [1, 2], [0, 3], [2, 3], [0, 4], [2, 4]],
  10: [[0, 0], [2, 0], [1, 1], [0, 1], [2, 1], [0, 3], [2, 3], [1, 3], [0, 4], [2, 4]],
};

const COL_X = [0.18, 0.5, 0.82];
const ROW_Y = [0.1, 0.3, 0.5, 0.7, 0.9];

function PipGrid({ value, symbol, color, cardW, cardH, padding }: {
  value: number; symbol: string; color: string;
  cardW: number; cardH: number; padding: number;
}) {
  const positions = PIP_POSITIONS[value];
  if (!positions) return null;

  const areaH = cardH - padding * 2;
  const areaW = cardW - 4;
  const isAce = value === 1;
  const pipSz = isAce
    ? Math.max(18, Math.min(cardW * 0.58, areaH * 0.52))
    : Math.max(7, Math.min(cardW * 0.22, areaH * 0.16));

  return (
    <View style={{ position: "absolute", top: padding, left: 2, right: 2, height: areaH }}>
      {positions.map(([col, row], i) => {
        const x = COL_X[col] * areaW - pipSz * 0.45;
        const y = ROW_Y[row] * areaH - pipSz * 0.5;
        return (
          <Text key={i} style={{ position: "absolute", left: x, top: y, fontSize: pipSz, color, lineHeight: pipSz * 1.1 }}>
            {symbol}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Face card center — large centered rank + decorative suit ─────────────────
function FaceCardCenter({ label, symbol, color, cardW, cardH, cornerPad, rankSz }: {
  label: string; symbol: string; color: string;
  cardW: number; cardH: number; cornerPad: number; rankSz: number;
}) {
  const topOffset = cornerPad + rankSz * 1.6;
  const centerH = cardH - topOffset * 2;
  const fontSize = Math.max(14, Math.min(cardW * 0.52, centerH * 0.55));
  return (
    <View style={{ position: "absolute", top: topOffset, left: 2, right: 2, bottom: topOffset, alignItems: "center", justifyContent: "center", gap: 2 }}>
      <Text style={{ fontSize, color, lineHeight: fontSize * 1.1, fontWeight: "800", fontFamily: "Georgia" }}>
        {label}
      </Text>
      <Text style={{ fontSize: fontSize * 0.55, color, lineHeight: fontSize * 0.6 }}>
        {symbol}
      </Text>
    </View>
  );
}

// ─── Card Back — courtroom-themed image or classic green fallback ─────────────
function CardBack({ width, height, selected, image }: {
  width: number; height: number; selected: boolean; image?: any;
}) {
  if (image) {
    return (
      <View
        style={[
          styles.card,
          {
            width,
            height,
            borderColor: selected ? "#f59e0b" : "#c9a84c88",
            borderWidth: selected ? 2.5 : 1.2,
            overflow: "hidden",
          },
        ]}
      >
        <Image source={image} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {selected && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(245,158,11,0.22)", borderRadius: 4 }]} />
        )}
      </View>
    );
  }

  // Fallback: classic green CSS back
  return (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: "#1a4a2e",
          borderColor: selected ? "#f59e0b" : "#c9a84c88",
          borderWidth: selected ? 2.5 : 1.2,
          overflow: "hidden",
        },
      ]}
    >
      <View style={StyleSheet.absoluteFill}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              width: width * 3,
              height: 1.5,
              backgroundColor: "rgba(201,168,76,0.10)",
              top: -width + i * (height / 6),
              left: -width,
              transform: [{ rotate: "-40deg" }],
            }}
          />
        ))}
      </View>
      <View style={[styles.backInnerBorder, { borderColor: "#c9a84c44" }]} />
      <View style={styles.backCenter}>
        <Text style={styles.backSymbol}>⚖</Text>
      </View>
      {selected && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(245,158,11,0.18)", borderRadius: 4 }]} />
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PlayingCard({ card, width = 52, height = 72, selected = false, style, backImage }: PlayingCardProps) {
  if (!card.faceUp) {
    return (
      <View style={style}>
        <CardBack width={width} height={height} selected={selected} image={backImage} />
      </View>
    );
  }

  const label    = getLabel(card.value);
  const symbol   = getSuitSymbol(card.suit);
  const isRed    = isRedSuit(card.suit);
  const suitColor = isRed ? "#c0392b" : "#1a2240";
  const isFace   = card.value >= 11;

  const bgColor       = selected ? "#fffef0" : "#ffffff";
  const selectedBorder = selected ? "#f59e0b" : "rgba(180,180,180,0.9)";

  const rankSz       = Math.max(8, width * 0.22);
  const suitCornerSz = Math.max(6, width * 0.16);
  const cornerPad    = Math.max(2, width * 0.04);

  return (
    <View
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: bgColor,
          borderColor: selectedBorder,
          borderWidth: selected ? 2 : 0.75,
        },
        style,
      ]}
    >
      <View style={[styles.corner, { top: cornerPad, left: cornerPad }]}>
        <Text style={[styles.rankText, { color: suitColor, fontSize: rankSz, lineHeight: rankSz * 1.05 }]}>{label}</Text>
        <Text style={[styles.suitCorner, { color: suitColor, fontSize: suitCornerSz, lineHeight: suitCornerSz }]}>{symbol}</Text>
      </View>

      {isFace ? (
        <FaceCardCenter
          label={label}
          symbol={symbol}
          color={suitColor}
          cardW={width}
          cardH={height}
          cornerPad={cornerPad}
          rankSz={rankSz}
        />
      ) : (
        <PipGrid
          value={card.value}
          symbol={symbol}
          color={suitColor}
          cardW={width}
          cardH={height}
          padding={rankSz * 1.6 + cornerPad}
        />
      )}

      <View style={[styles.corner, { bottom: cornerPad, right: cornerPad, transform: [{ rotate: "180deg" }] }]}>
        <Text style={[styles.rankText, { color: suitColor, fontSize: rankSz, lineHeight: rankSz * 1.05 }]}>{label}</Text>
        <Text style={[styles.suitCorner, { color: suitColor, fontSize: suitCornerSz, lineHeight: suitCornerSz }]}>{symbol}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.25,
    shadowRadius: 2.5,
    elevation: 3,
  },
  corner: {
    position: "absolute",
    alignItems: "center",
  },
  rankText: {
    fontWeight: "800",
    fontFamily: "Georgia",
  },
  suitCorner: {
    fontWeight: "400",
    marginTop: -2,
  },
  backInnerBorder: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  backCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  backSymbol: {
    fontSize: 16,
    color: "#c9a84c",
    opacity: 0.85,
  },
});
