import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Color = "black" | "red";

export interface Card {
  id: string;
  suit: Suit;
  value: number;
  faceUp: boolean;
}

export interface CompletedCase {
  id: string;
  title: string;
  outcome: string;
  principle: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  rarity: "common" | "rare" | "legendary";
  date: string;
  facts: string;
}

export type CourtroomId =
  | "stvincent"
  | "barbados"
  | "grenada"
  | "bahamas"
  | "jamaica"
  | "stkitts"
  | "guyana"
  | "england"
  | "houseofLords"
  | "usa"
  | "japan"
  | "australia";

export interface LeaderboardEntry {
  name: string;
  xp: number;
  wins: number;
  date: string;
  gameType: string;
}

export interface PlayerProfile {
  name: string;
  xp: number;
  level: number;
  reputation: number;
  streak: number;
  lastPlayDate: string;
  totalGames: number;
  wins: number;
  casebook: CompletedCase[];
  masteredTopics: { criminal: number; contract: number; tort: number; constitutional: number };
  theme: "dark" | "light";
  selectedCourtroom: CourtroomId;
  unlockedCourtrooms: string[];
  seenCaseIds: string[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

interface GameContextType {
  profile: PlayerProfile;
  leaderboard: LeaderboardEntry[];
  updateProfile: (updates: Partial<PlayerProfile>) => void;
  addCase: (c: CompletedCase) => void;
  addXP: (amount: number) => void;
  updateStreak: () => void;
  saveProfile: () => void;
  addLeaderboardEntry: (entry: LeaderboardEntry) => void;
  markCaseSeen: (id: string) => void;
}

// XP required to unlock each courtroom. 0 = always unlocked (starter).
export const COURTROOM_XP: Record<CourtroomId, number> = {
  stvincent:    0,
  barbados:     200,
  grenada:      500,
  bahamas:      900,
  jamaica:      1400,
  stkitts:      2000,
  guyana:       2800,
  england:      3500,
  houseofLords: 5000,
  usa:          7000,
  japan:        9000,
  australia:    11000,
};

const ALL_COURTROOM_IDS: CourtroomId[] = [
  "stvincent", "barbados", "grenada", "bahamas",
  "jamaica", "stkitts", "guyana",
  "england", "houseofLords", "usa", "japan", "australia",
];

/** Returns which courtroom IDs are unlocked for a given XP total */
function getUnlocked(xp: number): string[] {
  return ALL_COURTROOM_IDS.filter((id) => xp >= COURTROOM_XP[id]);
}

const LEVEL_TITLES = [
  { min: 0,     title: "Law Student" },
  { min: 200,   title: "Junior Associate" },
  { min: 600,   title: "Associate" },
  { min: 1200,  title: "Senior Associate" },
  { min: 2000,  title: "Senior Counsel" },
  { min: 3500,  title: "Barrister" },
  { min: 5500,  title: "QC / KC" },
  { min: 8000,  title: "High Court Judge" },
  { min: 12000, title: "Chief Justice" },
];

export function getLevelTitle(xp: number): string {
  for (let i = LEVEL_TITLES.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_TITLES[i].min) return LEVEL_TITLES[i].title;
  }
  return "Law Student";
}

export function getXPForNextLevel(xp: number): { current: number; next: number; title: string } {
  for (let i = 0; i < LEVEL_TITLES.length - 1; i++) {
    if (xp < LEVEL_TITLES[i + 1].min) {
      return { current: LEVEL_TITLES[i].min, next: LEVEL_TITLES[i + 1].min, title: LEVEL_TITLES[i].title };
    }
  }
  const last = LEVEL_TITLES[LEVEL_TITLES.length - 1];
  return { current: last.min, next: last.min + 5000, title: last.title };
}

const defaultProfile: PlayerProfile = {
  name: "",
  xp: 0,
  level: 0,
  reputation: 0,
  streak: 0,
  lastPlayDate: "",
  totalGames: 0,
  wins: 0,
  casebook: [],
  masteredTopics: { criminal: 0, contract: 0, tort: 0, constitutional: 0 },
  theme: "dark",
  selectedCourtroom: "stvincent",
  unlockedCourtrooms: ["stvincent"],
  seenCaseIds: [],
  soundEnabled: true,
  hapticsEnabled: true,
};

export const GameContext = createContext<GameContextType>({} as GameContextType);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(defaultProfile);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet(["player_profile", "leaderboard"]).then(([profileData, lbData]) => {
      if (profileData[1]) {
        try {
          const parsed = JSON.parse(profileData[1]);
          const xp = parsed.xp ?? 0;
          setProfile({
            ...defaultProfile,
            ...parsed,
            // Recompute unlocked courtrooms from actual XP — never override with "all"
            unlockedCourtrooms: getUnlocked(xp),
            masteredTopics: {
              criminal: 0, contract: 0, tort: 0, constitutional: 0,
              ...(parsed.masteredTopics || {}),
            },
            seenCaseIds: parsed.seenCaseIds || [],
            soundEnabled: parsed.soundEnabled ?? true,
            hapticsEnabled: parsed.hapticsEnabled ?? true,
          });
        } catch (_) {}
      }
      if (lbData[1]) {
        try { setLeaderboard(JSON.parse(lbData[1])); } catch (_) {}
      }
    });
  }, []);

  const saveProfile = useCallback(() => {
    setProfile((p) => {
      AsyncStorage.setItem("player_profile", JSON.stringify(p));
      return p;
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<PlayerProfile>) => {
    setProfile((p) => {
      const newXP = updates.xp ?? p.xp;
      const updated = {
        ...p,
        ...updates,
        unlockedCourtrooms: getUnlocked(newXP),
      };
      AsyncStorage.setItem("player_profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addCase = useCallback((c: CompletedCase) => {
    setProfile((p) => {
      const exists = p.casebook.find((x) => x.id === c.id);
      if (exists) return p;
      const updated = { ...p, casebook: [c, ...p.casebook].slice(0, 100) };
      AsyncStorage.setItem("player_profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addXP = useCallback((amount: number) => {
    setProfile((p) => {
      const newXP = p.xp + amount;
      const updated = {
        ...p,
        xp: newXP,
        unlockedCourtrooms: getUnlocked(newXP),
      };
      AsyncStorage.setItem("player_profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateStreak = useCallback(() => {
    const today = new Date().toDateString();
    setProfile((p) => {
      if (p.lastPlayDate === today) return p;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = p.lastPlayDate === yesterday ? p.streak + 1 : 1;
      const updated = { ...p, streak: newStreak, lastPlayDate: today };
      AsyncStorage.setItem("player_profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addLeaderboardEntry = useCallback((entry: LeaderboardEntry) => {
    setLeaderboard((lb) => {
      const updated = [...lb, entry]
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 50);
      AsyncStorage.setItem("leaderboard", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markCaseSeen = useCallback((id: string) => {
    setProfile((p) => {
      if (p.seenCaseIds.includes(id)) return p;
      const updated = { ...p, seenCaseIds: [...p.seenCaseIds, id].slice(-200) };
      AsyncStorage.setItem("player_profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <GameContext.Provider value={{
      profile,
      leaderboard,
      updateProfile,
      addCase,
      addXP,
      updateStreak,
      saveProfile,
      addLeaderboardEntry,
      markCaseSeen,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
