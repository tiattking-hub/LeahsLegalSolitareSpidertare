#!/usr/bin/env node
// Merges generated cases into the existing legalCases.ts
import { readFileSync, writeFileSync } from "fs";

const generated = JSON.parse(readFileSync("scripts/all-generated.json", "utf8"));
console.log(`Loaded ${generated.length} generated cases`);

// Read existing file up to the closing of STATIC_CASES array
const existing = readFileSync("artifacts/mobile/utils/legalCases.ts", "utf8");
const closeIdx = existing.indexOf("\nexport const LEGAL_FACTS");
if (closeIdx === -1) { console.error("Could not find LEGAL_FACTS marker"); process.exit(1); }

// Find the last ]  before LEGAL_FACTS (closing of STATIC_CASES)
const beforeFacts = existing.slice(0, closeIdx);
const lastBracket = beforeFacts.lastIndexOf("];");
if (lastBracket === -1) { console.error("Could not find closing ]; of STATIC_CASES"); process.exit(1); }

function esc(s) { return String(s||"").replace(/\\/g,"\\\\").replace(/`/g,"\\`").replace(/\${/g,"\\${"); }

const newEntries = generated.map(c => `  {
    id: "${c.id}",
    title: "${String(c.title||"").replace(/"/g,'\\"')}",
    facts: "${String(c.facts||"").replace(/"/g,'\\"')}",
    question: "${String(c.question||"").replace(/"/g,'\\"')}",
    options: [${c.options.map(o => `"${String(o).replace(/"/g,'\\"')}"`).join(", ")}],
    correctIndex: ${c.correctIndex},
    explanation: "${String(c.explanation||"").replace(/"/g,'\\"')}",
    eli5: "${String(c.eli5||"").replace(/"/g,'\\"')}",
    category: "${c.category}", difficulty: "${c.difficulty}", rarity: "${c.rarity}",
    principle: "${String(c.principle||"").replace(/"/g,'\\"')}",
  }`).join(",\n");

const newFile = 
  beforeFacts.slice(0, lastBracket) +
  ",\n  // ─── AI-GENERATED CASES ─────────────────────────────────────────────────────\n" +
  newEntries + "\n" +
  "];" +
  existing.slice(closeIdx);

writeFileSync("artifacts/mobile/utils/legalCases.ts", newFile);
console.log(`Done! legalCases.ts now has ${55 + generated.length} cases total`);
