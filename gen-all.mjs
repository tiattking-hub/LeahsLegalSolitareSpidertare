#!/usr/bin/env node
// Generates 445 new legal cases in serial batches of 10, saving progress incrementally
import { writeFileSync, readFileSync, existsSync } from "fs";

const BASE_URL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const API_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
if (!BASE_URL || !API_KEY) { console.error("Missing env vars"); process.exit(1); }

const OUT = "scripts/all-generated.json";
const LOG = "scripts/gen-progress.log";

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { writeFileSync(LOG, line + "\n", { flag: "a" }); } catch {}
}

async function callOpenAI(prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90000);
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: "gpt-5-mini",
          max_completion_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const d = await res.json();
      return d.choices[0]?.message?.content ?? "[]";
    } catch(e) {
      log(`  Attempt ${attempt+1} failed: ${e.message}`);
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return "[]";
}

const CONFIGS = [
  {cats:["criminal","contract"],diff:"easy"},{cats:["tort","constitutional"],diff:"easy"},
  {cats:["criminal","tort"],diff:"easy"},{cats:["contract","constitutional"],diff:"easy"},
  {cats:["criminal","contract"],diff:"easy"},{cats:["tort","constitutional"],diff:"easy"},
  {cats:["criminal","contract"],diff:"medium"},{cats:["tort","constitutional"],diff:"medium"},
  {cats:["criminal","tort"],diff:"medium"},{cats:["contract","constitutional"],diff:"medium"},
  {cats:["criminal","contract"],diff:"medium"},{cats:["tort","constitutional"],diff:"medium"},
  {cats:["criminal","tort"],diff:"medium"},{cats:["contract","constitutional"],diff:"medium"},
  {cats:["criminal","contract"],diff:"hard"},{cats:["tort","constitutional"],diff:"hard"},
  {cats:["criminal","tort"],diff:"hard"},{cats:["contract","constitutional"],diff:"hard"},
  {cats:["criminal","contract"],diff:"hard"},{cats:["tort","constitutional"],diff:"hard"},
  {cats:["criminal","tort"],diff:"hard"},{cats:["contract","constitutional"],diff:"hard"},
  {cats:["criminal","contract"],diff:"hard"},{cats:["tort","constitutional"],diff:"hard"},
  {cats:["criminal","contract","tort","constitutional"],diff:"easy"},
  {cats:["criminal","contract","tort","constitutional"],diff:"medium"},
  {cats:["criminal","contract","tort","constitutional"],diff:"medium"},
  {cats:["criminal","contract","tort","constitutional"],diff:"hard"},
  {cats:["criminal","contract","tort","constitutional"],diff:"hard"},
  {cats:["criminal","contract","tort","constitutional"],diff:"hard"},
  {cats:["criminal","contract","tort","constitutional"],diff:"medium"},
  {cats:["constitutional","criminal"],diff:"hard"},
  {cats:["tort","contract"],diff:"hard"},
  {cats:["criminal","contract"],diff:"easy"},
  {cats:["tort","constitutional"],diff:"easy"},
  {cats:["criminal","contract"],diff:"medium"},
  {cats:["tort","constitutional"],diff:"medium"},
  {cats:["criminal","contract"],diff:"hard"},
  {cats:["tort","constitutional"],diff:"hard"},
  {cats:["criminal","contract","tort","constitutional"],diff:"hard"},
  {cats:["criminal","contract","tort","constitutional"],diff:"medium"},
  {cats:["criminal","contract","tort","constitutional"],diff:"easy"},
  {cats:["criminal","tort"],diff:"easy"},
  {cats:["contract","constitutional"],diff:"medium"},
  {cats:["constitutional","criminal"],diff:"medium"},
];

const PER_BATCH = 10;
const TOTAL_NEEDED = 445;
const NUM_BATCHES = Math.ceil(TOTAL_NEEDED / PER_BATCH);

// Load existing results
let existing = [];
if (existsSync(OUT)) {
  try { existing = JSON.parse(readFileSync(OUT, "utf8")); } catch {}
}
const startBatch = Math.floor(existing.length / PER_BATCH);
log(`Starting at batch ${startBatch}, already have ${existing.length} cases`);

const valid = ["criminal","contract","tort","constitutional"];
const diffs = ["easy","medium","hard"];
const rarities = ["common","rare","legendary"];

for (let b = startBatch; b < NUM_BATCHES && existing.length < TOTAL_NEEDED; b++) {
  const cfg = CONFIGS[b % CONFIGS.length];
  const startId = 56 + b * PER_BATCH;
  const needed = Math.min(PER_BATCH, TOTAL_NEEDED - existing.length);
  
  log(`Batch ${b+1}/${NUM_BATCHES}: ${needed} ${cfg.diff} [${cfg.cats.join(",")}] (id c${String(startId).padStart(3,"0")}...)`);
  
  const rarityGuide = cfg.diff==="easy"?"80% common, 20% rare":cfg.diff==="medium"?"60% common, 30% rare, 10% legendary":"40% common, 35% rare, 25% legendary";
  
  const prompt = `Law professor. ${needed} Caribbean/international law cases as raw JSON array only.

Categories: ${cfg.cats.join(", ")} | Difficulty: ${cfg.diff} | Rarity: ${rarityGuide}

Each element: {"title":"3-6 words","facts":"2-3 sentences with Caribbean/Commonwealth/international settings","question":"Legal question?","options":["A","B","C","D"],"correctIndex":0,"explanation":"2-3 sentences","eli5":"Analogy for 12-year-old","category":"criminal","difficulty":"${cfg.diff}","rarity":"common","principle":"Doctrine — description"}

Rules: vary correctIndex 0-3; category one of criminal/contract/tort/constitutional; unique scenarios; Caribbean names (Marcia, Devon, Ruel, Sasha, Troy, Kezia, Camille, Deron, Priya, Marcus).
Return ONLY JSON array with ${needed} elements.`;

  const text = await callOpenAI(prompt);
  const clean = text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
  const start = clean.indexOf("[");
  const raw = start >= 0 ? clean.slice(start) : clean;
  
  let cases = [];
  try { cases = JSON.parse(raw); }
  catch {
    const last = raw.lastIndexOf("}");
    try { cases = last>0 ? JSON.parse(raw.slice(0,last+1)+"]") : []; } catch {}
  }
  
  if (!Array.isArray(cases)) cases = [];
  
  const batch = cases.slice(0, needed).map((c, i) => ({
    id: `c${String(startId + i).padStart(3, "0")}`,
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
  
  existing.push(...batch);
  writeFileSync(OUT, JSON.stringify(existing, null, 2));
  log(`  ✓ Got ${batch.length} cases. Total: ${existing.length}/${TOTAL_NEEDED}`);
  
  // Small breathing room
  await new Promise(r => setTimeout(r, 500));
}

log(`\nComplete! ${existing.length} cases saved to ${OUT}`);
