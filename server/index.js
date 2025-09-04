// server/index.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // si tenés Node 18+ podés usar fetch global
import Fuse from "fuse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://dxproes.netlify.app"],
  })
);
app.use(express.json());

// -----------------------------
// Rutas base de casos
// -----------------------------
const BASE_CASES_PATH = path.join(__dirname, "casos_basicos");

// Cache dinámico de casos cargados: { caseId: { data, variantMapExact, variantIndex, fuse } }
const loadedCases = {};

// -----------------------------
// Utilidades de texto / NLP ligero
// -----------------------------
const STOPWORDS_ES = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","ante","bajo","cabe","con",
  "contra","desde","durante","en","entre","hacia","hasta","para","por","segun","sin","sobre","tras",
  "y","o","u","e","que","qué","como","cómo","cual","cuales","cuál","cuáles","cuanto","cuánta",
  "cuantos","cuántos","cuanta","cuánta","cuando","cuándo","donde","dónde","quien","quién","quienes","quiénes",
  "yo","tu","tú","vos","usted","ustedes","mi","mis","su","sus","es","son","esta","está","estan","están",
  "soy","eres","somos","ser","estar","hay","tener","tiene","tenes","tienes","tienen","hace","hacia"
]);

function normalize(text) {
  return (String(text || ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")               // quita tildes
    .replace(/[^\p{L}\p{N}\s]/gu, " ")             // quita signos y símbolos
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const norm = normalize(text);
  const toks = norm.split(" ").filter(t => t.length > 0);
  // eliminar stopwords y tokens muy cortos
  return toks.filter(t => !STOPWORDS_ES.has(t) && t.length >= 3);
}

function jaccard(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

// split preguntas compuestas
function splitQuestions(input) {
  return normalize(input)
    .split(/\?+|\.|,| y | tambien | además | ademas/gi)
    .map(s => s.trim())
    .filter(Boolean);
}

// -----------------------------
// Indización por caso (variantMapExact, variantIndex, fuse)
// -----------------------------
function buildIndexesForCase(caseData) {
  const variantMapExact = new Map();
  const variantIndex = [];
  const fuseList = [];

  const respuestas = caseData.respuestas || {};
  for (const [intent, obj] of Object.entries(respuestas)) {
    const variantes = Array.isArray(obj.variantes) ? obj.variantes : [];
    for (const v of variantes) {
      const norm = normalize(v);
      variantMapExact.set(norm, { intent, respuesta: obj.respuesta });
      variantIndex.push({
        intent,
        variante: v,
        tokens: tokenize(v),
        respuesta: obj.respuesta,
      });
    }
    fuseList.push({ intent, variantes, respuesta: obj.respuesta });
  }

  const fuse = new Fuse(fuseList, {
    keys: ["variantes"],
    includeScore: true,
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  return { variantMapExact, variantIndex, fuse };
}

// Cargar un caso desde disco (y construir índices)
function loadCase(caseId, casePath) {
  if (loadedCases[caseId]) return loadedCases[caseId];

  const raw = fs.readFileSync(casePath, "utf-8");
  const data = JSON.parse(raw);

  const { variantMapExact, variantIndex, fuse } = buildIndexesForCase(data);
  loadedCases[caseId] = { data, variantMapExact, variantIndex, fuse, casePath };
  console.log(`[CASE] cargado ${caseId}`);
  return loadedCases[caseId];
}

// Enumerar todos los casos (caseId, casePath)
function getAllCasesList() {
  const results = [];
  if (!fs.existsSync(BASE_CASES_PATH)) return results;

  const systems = fs.readdirSync(BASE_CASES_PATH, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const sys of systems) {
    const sysPath = path.join(BASE_CASES_PATH, sys);
    const files = fs.readdirSync(sysPath).filter(f => f.endsWith(".json"));
    for (const f of files) {
      results.push({ caseId: `${sys}/${f}`, casePath: path.join(sysPath, f) });
    }
  }
  return results;
}

// -----------------------------
// Matching robusto para 1 pregunta (usa índices del caso)
// -----------------------------
function findBestAnswerForCase(question, caseObj) {
  const qNorm = normalize(question);
  const qTokens = tokenize(question);

  // 1) coincidencia exacta de variante
  const exact = caseObj.variantMapExact.get(qNorm);
  if (exact) return exact.respuesta;

  // 2) similitud por tokens (Jaccard) — preferimos puntuaciones altas
  let bestToken = null;
  let bestScore = 0;
  for (const item of caseObj.variantIndex) {
    if (!item.tokens || item.tokens.length === 0) continue;
    const score = jaccard(qTokens, item.tokens);
    const bonus = (score >= 0.5 && item.tokens.length >= 2 && qTokens.length >= 2) ? 0.05 : 0;
    const final = score + bonus;
    if (final > bestScore) {
      bestScore = final;
      bestToken = item;
    }
  }
  // Umbral: evitar falsos positivos
  if (bestToken && bestScore >= 0.58) return bestToken.respuesta;

  // 3) Fuse.js como último recurso local
  if (caseObj.fuse) {
    const res = caseObj.fuse.search(qNorm);
    if (res.length) {
      const top = res[0];
      if (top.score <= 0.30) return top.item.respuesta;
      // si una variante del item coincide exactamente con la pregunta, tomarla
      const maybeExact = top.item.variantes?.find(v => normalize(v) === qNorm);
      if (maybeExact) return top.item.respuesta;
    }
  }

  // 4) no convincente -> null (quien llama decide fallback)
  return null;
}

// -----------------------------
// GEMINI fallback (opcional)
// -----------------------------
async function callGeminiAPI(pregunta, caseData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" +
    apiKey;

  // Prompt controlado: forzar que responda solo con info del caso
  const prompt = `
Eres un paciente simulado. Estos son los datos del caso:
${JSON.stringify(caseData, null, 2)}

Reglas:
- RESPONDER SÓLO en base a la información provista arriba.
- Si la información no está, devolver exactamente: "${caseData.desconocido || "No entendí tu pregunta, ¿podés reformularla?"}".
- No inventar nuevos datos.

Pregunta del estudiante: "${pregunta}"
`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.15, maxOutputTokens: 200 },
  };

  try {
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
    return null;
  } catch (e) {
    console.error("[GEMINI ERROR]", e.message || e);
    return null;
  }
}

// -----------------------------
// Evaluación: diagnóstico y tratamiento (similitud & matching flexible)
// -----------------------------
function similarityText(a, b) {
  return jaccard(tokenize(a || ""), tokenize(b || ""));
}

function bestSimilarity(candidate, list) {
  let best = 0;
  let bestRef = null;
  for (const ref of list) {
    const s = similarityText(candidate, ref);
    if (s > best) {
      best = s;
      bestRef = ref;
    }
  }
  return { best, bestRef };
}

function evaluateDiagnosis(userText, expectedList) {
  if (!userText) return { correcto: false, similitud: 0, referencia: null };
  const { best, bestRef } = bestSimilarity(userText, expectedList || []);
  const correcto = best >= 0.72;
  return { correcto, similitud: Number(best.toFixed(2)), referencia: correcto ? bestRef : bestRef };
}

function parseTreatmentItems(textOrArray) {
  if (Array.isArray(textOrArray)) return textOrArray.map(t => normalize(t)).filter(Boolean);
  const text = String(textOrArray || "");
  return normalize(text)
    .split(/,|;|\+| y | e | y /g)
    .map(s => s.trim())
    .filter(Boolean);
}

function evaluateTreatment(user, expectedList) {
  const userItems = parseTreatmentItems(user);
  const exp = (expectedList || []).map(normalize);

  const aciertos = [];
  const faltantes = [];
  const extras = [];

  const USED = new Set();
  for (const u of userItems) {
    const { best, bestRef } = bestSimilarity(u, exp.filter(e => !USED.has(e)));
    if (bestRef && best >= 0.70) {
      aciertos.push(bestRef);
      USED.add(bestRef);
    } else {
      extras.push(u);
    }
  }

  for (const e of exp) {
    if (!USED.has(e)) faltantes.push(e);
  }

  const puntaje = exp.length === 0 ? 1 : Math.max(0, Math.min(1, aciertos.length / exp.length));
  return {
    aciertos,
    faltantes,
    extras,
    puntaje: Number(puntaje.toFixed(2)),
  };
}

// -----------------------------
// ENDPOINTS
// -----------------------------

// Root
app.get("/", (_req, res) => {
  res.send("✅ DxPro API: casos por sistema + matching robusto + evaluación");
});

// GET /api/caso?system=<id>  (system=all para todos)
app.get("/api/caso", (req, res) => {
  try {
    const system = (req.query.system || "all").toString();
    let candidates = [];

    if (!fs.existsSync(BASE_CASES_PATH)) {
      return res.status(500).json({ error: "No existe la carpeta casos_basicos en el servidor." });
    }

    if (system === "all" || system === "todos") {
      candidates = getAllCasesList();
    } else {
      const sysPath = path.join(BASE_CASES_PATH, system);
      if (!fs.existsSync(sysPath) || !fs.statSync(sysPath).isDirectory()) {
        return res.status(400).json({ error: "Sistema solicitado no existe." });
      }
      const files = fs.readdirSync(sysPath).filter(f => f.endsWith(".json"));
      candidates = files.map(f => ({ caseId: `${system}/${f}`, casePath: path.join(sysPath, f) }));
    }

    if (!candidates.length) return res.status(404).json({ error: "No hay casos para ese sistema." });

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const caseLoaded = loadCase(chosen.caseId, chosen.casePath);

    return res.json({
      casoId: chosen.caseId,
      presentacion: caseLoaded.data.presentacion || caseLoaded.data.presentacion_inicio || "Caso sin presentación",
      metadata: caseLoaded.data.metadata || { sistema: system },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al seleccionar el caso." });
  }
});

// POST /api/preguntar  { pregunta, caseId }
app.post("/api/preguntar", async (req, res) => {
  try {
    const { pregunta, caseId } = req.body || {};
    if (!pregunta) return res.status(400).json({ respuestas: ["Falta campo 'pregunta'"] });
    if (!caseId) return res.status(400).json({ respuestas: ["Falta 'caseId'. Primero obtené /api/caso para recibir caseId."] });

    // cargar caso si no está en memoria
    const [systemPart, filePart] = caseId.split("/"); // aproximado
    const casePathGuess = path.join(BASE_CASES_PATH, systemPart, filePart);
    if (!loadedCases[caseId]) {
      if (!fs.existsSync(casePathGuess)) {
        return res.status(404).json({ respuestas: ["Caso no encontrado en servidor"] });
      }
      loadCase(caseId, casePathGuess);
    }
    const caseObj = loadedCases[caseId];
    if (!caseObj) return res.status(500).json({ respuestas: ["Error interno: no se pudo cargar el caso"] });

    const subQs = splitQuestions(pregunta);
    const out = [];

    for (const q of subQs) {
      let ans = findBestAnswerForCase(q, caseObj);
      if (!ans) {
        // fallback a Gemini si disponible
        const ai = await callGeminiAPI(q, caseObj.data);
        ans = ai || caseObj.data.desconocido || "No entendí tu pregunta, ¿podés reformularla?";
      }
      out.push(ans);
    }

    return res.json({ respuestas: out });
  } catch (e) {
    console.error("POST /api/preguntar error:", e);
    res.status(500).json({ respuestas: ["⚠️ Error del servidor al procesar la pregunta."] });
  }
});

// POST /api/evaluar { diagnostico, tratamiento, caseId }
app.post("/api/evaluar", (req, res) => {
  try {
    const { diagnostico, tratamiento, caseId } = req.body || {};
    if (!caseId) return res.status(400).json({ error: "Falta caseId" });

    // si no está cargado, intentar cargar
    const [systemPart, filePart] = caseId.split("/");
    const casePathGuess = path.join(BASE_CASES_PATH, systemPart, filePart);
    if (!loadedCases[caseId]) {
      if (!fs.existsSync(casePathGuess)) {
        return res.status(404).json({ error: "Caso no encontrado" });
      }
      loadCase(caseId, casePathGuess);
    }
    const caseObj = loadedCases[caseId];
    if (!caseObj) return res.status(500).json({ error: "Error interno" });

    const ev = caseObj.data.evaluacion || {};
    const diagEsperado = Array.isArray(ev.diagnostico_presuntivo) ? ev.diagnostico_presuntivo : [];
    const ttoEsperado = Array.isArray(ev.tratamiento_inicial_esperado) ? ev.tratamiento_inicial_esperado : [];

    const diag = evaluateDiagnosis(diagnostico || "", diagEsperado);
    const tto = evaluateTreatment(tratamiento || "", ttoEsperado);

    const scoreDiag = diag.correcto ? 1 : Math.min(1, Math.max(0, diag.similitud));
    const total = Number((0.6 * scoreDiag + 0.4 * tto.puntaje).toFixed(2));

    const feedback = [];
    if (diag.correcto) feedback.push(`✅ Diagnóstico: correcto (${diag.referencia}).`);
    else feedback.push(`❗Diagnóstico: no coincide con el esperado. Mejor aproximación: ${diag.referencia || "—"}.`);

    if (tto.aciertos.length) feedback.push(`✅ Tratamiento: incluido → ${tto.aciertos.join(", ")}.`);
    if (tto.faltantes.length) feedback.push(`🧩 Faltó mencionar → ${tto.faltantes.join(", ")}.`);
    if (tto.extras.length) feedback.push(`ℹ️ Ítems no esperados → ${tto.extras.join(", ")}.`);

    return res.json({
      puntaje: {
        diagnostico: Number((scoreDiag * 100).toFixed(0)),
        tratamiento: Number((tto.puntaje * 100).toFixed(0)),
        total: Number((total * 100).toFixed(0)),
      },
      diagnostico: diag,
      tratamiento: tto,
      feedback,
    });
  } catch (e) {
    console.error("POST /api/evaluar error:", e);
    res.status(500).json({ error: "Error al evaluar" });
  }
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`✅ API lista en http://localhost:${PORT}`);
});
