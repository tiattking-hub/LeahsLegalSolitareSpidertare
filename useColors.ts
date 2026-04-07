import { useContext } from "react";
import colors from "@/constants/colors";
import { GameContext } from "@/context/GameContext";

export function useColors() {
  const ctx = useContext(GameContext);
  const theme = ctx?.profile?.theme ?? "dark";
  const palette = theme === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
