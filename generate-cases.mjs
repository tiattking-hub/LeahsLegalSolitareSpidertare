#!/usr/bin/env node
import { writeFileSync } from "fs";

const BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const BATCH_SIZE = parseInt(process.argv[2] || "15");
const BATCH_INDEX = parseInt(process.argv[3] || "0");

if (!BASE_URL || !API_KEY) { console.error("Missing AI env vars"); process.exit(1); }

async function callOpenAI(prompt) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 75000);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        max_completion_tokens: 5000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    const d = await res.json();
    return d.choices[0]?.message?.content ?? "[]";
  } finally {
    clearTimeout(timeout);
  }
}

const BATCH_CONFIGS = [
  { cats: ["criminal","contract"], diff: "easy" },
  { cats: ["tort","constitutional"], diff: "easy" },
  { cats: ["criminal","tort"], diff: "easy" },
  { cats: ["contract","constitutional"], diff: "easy" },
  { cats: ["criminal","contract"], diff: "medium" },
  { cats: ["tort","constitutional"], diff: "medium" },
  { cats: ["criminal","tort"], diff: "medium" },
  { cats: ["contract","constitutional"], diff: "medium" },
  { cats: ["criminal","contract"], diff: "hard" },
  { cats: ["tort","constitutional"], diff: "hard" },
  { cats: ["criminal","tort"], diff: "hard" },
  { cats: ["contract","constitutional"], diff: "hard" },
  { cats: ["criminal","contract","tort"], diff: "easy" },
  { cats: ["constitutional","criminal"], diff: "medium" },
  { cats: ["tort","contract"], diff: "hard" },
  { cats: ["constitutional","criminal","tort"], diff: "hard" },
  { cats: ["contract","criminal"], diff: "easy" },
  { cats: ["tort","constitutional"], diff: "medium" },
  { cats: ["criminal","contract"], diff: "hard" },
  { cats: ["constitutional","tort"], diff: "hard" },
  { cats: ["criminal","contract","tort","constitutional"], diff: "medium" },
  { cats: ["criminal","contract","tort","constitutional"], diff: "hard" },
  { cats: ["criminal","contract"], diff: "easy" },
  { cats: ["tort","constitutional"], diff: "easy" },
  { cats: ["criminal","contract"], diff: "medium" },
  { cats: ["tort","constitutional"], diff: "medium" },
  { cats: ["criminal","contract"], diff: "hard" },
  { cats: ["tort","constitutional"], diff: "hard" },
  { cats: ["criminal","tort"], diff: "easy" },
  { cats: ["contract","constitutional"], diff: "medium" },
];

const cfg = BATCH_CONFIGS[BATCH_INDEX % BATCH_CONFIGS.length];
const startId = 56 + BATCH_INDEX * BATCH_SIZE;

const prompt = `Law professor. Generate ${BATCH_SIZE} Caribbean/international law education cases as a raw JSON array only. No markdown.

Categories to mix: ${cfg.cats.join(", ")}
Difficulty: ${cfg.diff}

JSON shape per element:
{"title":"3-6 words","facts":"2-3 sentences, Caribbean/Commonwealth/international setting","question":"Legal question?","options":["A","B","C","D"],"correctIndex":1,"explanation":"2-3 sentences","eli5":"Analogy for 12-year-old","category":"criminal","difficulty":"${cfg.diff}","rarity":"common","principle":"Doctrine — description"}

Rules:
- correctIndex: vary 0/1/2/3 roughly equally  
- category: criminal|contract|tort|constitutional
- rarity: ${cfg.diff==="easy"?"80% common, 20% rare":cfg.diff==="medium"?"60% common, 30% rare, 10% legendary":"40% common, 35% rare, 25% legendary"}
- Unique scenarios, Caribbean names (Marcia, Devon, Sasha, Troy, Ruel, Kezia, Camille, Deron)
- Return ONLY the JSON array with ${BATCH_SIZE} elements`;

let text = await callOpenAI(prompt);
text = text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
const arrStart = text.indexOf("[");
if (arrStart > 0) text = text.slice(arrStart);

let cases;
try { cases = JSON.parse(text); }
catch { 
  const last = text.lastIndexOf("}");
  try { cases = last>0 ? JSON.parse(text.slice(0,last+1)+"]") : []; } catch { cases = []; }
}

const valid = ["criminal","contract","tort","constitutional"];
const diffs = ["easy","medium","hard"];
const rarities = ["common","rare","legendary"];

const result = (Array.isArray(cases)?cases:[]).slice(0, BATCH_SIZE).map((c,i) => ({
  id: `c${String(startId+i).padStart(3,"0")}`,
  title: String(c.title||"Legal Case").slice(0,60),
  facts: String(c.facts||""),
  question: String(c.question||""),
  options: Array.isArray(c.options)&&c.options.length===4?c.options.map(String):["Option A","Option B","Option C","Option D"],
  correctIndex: [0,1,2,3].includes(c.correctIndex)?c.correctIndex:1,
  explanation: String(c.explanation||""),
  eli5: String(c.eli5||""),
  category: valid.includes(c.category)?c.category:cfg.cats[0],
  difficulty: diffs.includes(c.difficulty)?c.difficulty:cfg.diff,
  rarity: rarities.includes(c.rarity)?c.rarity:"common",
  principle: String(c.principle||""),
}));

const outFile = `scripts/batch-${String(BATCH_INDEX).padStart(2,"0")}.json`;
writeFileSync(outFile, JSON.stringify(result, null, 2));
console.log(`Batch ${BATCH_INDEX}: ${result.length} cases → ${outFile}`);
