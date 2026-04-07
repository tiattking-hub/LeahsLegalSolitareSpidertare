# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a legal-themed Spider Solitaire mobile app.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with expo-router

## Mobile App: Leah's Legal Spider Solitaire

An Expo mobile app combining Spider Solitaire gameplay with legal learning.

### Key Files
- `artifacts/mobile/app/index.tsx` — Home screen (Play Now + Legal Exam buttons)
- `artifacts/mobile/app/game.tsx` — Spider/Klondike Solitaire with loading animation, animated win screen
- `artifacts/mobile/app/exam.tsx` — Legal Exam mode (10 Qs, timer, marking, explanations, grades)
- `artifacts/mobile/app/career.tsx` — Career progression screen
- `artifacts/mobile/app/casebook.tsx` — Case collection viewer
- `artifacts/mobile/app/flashcards.tsx` — Legal flashcard revision
- `artifacts/mobile/app/challenge.tsx` — Friend challenge & share
- `artifacts/mobile/app/settings.tsx` — Settings (name, dark/light mode)
- `artifacts/mobile/app/courtrooms.tsx` — Caribbean courtroom selector
- `artifacts/mobile/app/stats.tsx` — Player statistics
- `artifacts/mobile/context/GameContext.tsx` — Global game state with AsyncStorage
- `artifacts/mobile/utils/spiderSolitaire.ts` — Spider Solitaire game engine
- `artifacts/mobile/utils/legalCases.ts` — Legal cases, facts, and quiz questions
- `artifacts/mobile/components/GameBoard.tsx` — Card game rendering
- `artifacts/mobile/components/PlayingCard.tsx` — Individual card component
- `artifacts/mobile/components/LegalQuestionModal.tsx` — Legal Q&A modal
- `artifacts/mobile/constants/colors.ts` — Dark green/gold legal theme

### Features
- Spider Solitaire with tap-to-select card movement
- Legal quiz questions triggered by completing suits
- Casebook — unlockable cases saved in a legal folder
- Career mode with XP progression (Law Student → Chief Justice)
- Flashcards with flip animation for all legal topics
- 4 Caribbean courtroom backgrounds (St. Vincent, Barbados, Grenada, Bahamas)
- Courtroom backgrounds unlock as XP increases
- Dark/light theme toggle in settings
- Customizable player name
- Friend challenge sharing
- Player statistics tracking
- Random court events during gameplay
- Interesting legal facts at game end

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
