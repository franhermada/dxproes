import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import Fuse from "fuse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://dxproes.netlify.app",
    ],
  })
);
app.use(express.json());

// =========================
//  CARGA DEL CASO CLÍNICO
// =========================
const jsonFilePath = path.join(__dirname, "casos", "caso1.json");
let clinicalCaseData = null;

function loadCase() {
  try {
    const content = fs.readFileSync(jsonFilePath, "utf8");
    clinicalCaseData = JSON.parse(content);
    console.log("✅ caso1.json cargado.");
  } catch (e) {
    console.error("❌ No se pudo cargar caso1.json:", e.message);
    clinicalCaseData = null;
  }
}
loadCase();

// Hot reload simple si querés (opcional):
// fs.watch(jsonFilePath, { persistent: false }, () => {
//   console.log("♻️ Recargando caso1.json...");
//   loadCase();
// });

// =========================
//  NORMALIZACIÓN + NLP LIGERO
// =========================
const STOPWORDS_ES = new Set([
  "el","la","los","las","un","una","unos","unas","de","del","al","a","ante","bajo","cabe","con",
  "contra","desde","durante","en","entre","hacia","hasta","para","por","segun","sin","sobre","tras",
  "y","o","u","e","que","qué","como","cómo","cual","cuales","cuales","cuál","cuáles","cuanto","cuánta",
  "cuantos","cuántos","cuanta","cuánta","cuando","cuándo","donde","dónde","quien","quién","quienes","quiénes",
  "yo","tu","tú","vos","usted","ustedes","el","ella","ellos","ellas","mi","mi","su","sus","mis",
  "es","son","sera","será","fue","fueron","esta","está","estan","están","soy","eres","somos","ser","estar",
  "hay","habia","había","hubo","tener","tiene","tenes","tienes","tienen","hace","hacia"
]);

function normalize(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tildes
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punt, símbolos
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const norm = normalize(text);
  const tokens = norm.split(" ").filter(t => t.length > 0);
  // quitamos stopwords y tokens muy cortos (evita que “fr”, “fc” ensucien)
  return tokens.filter(t => !STOPWORDS_ES.has(t) && t.length >= 3);
}

function jaccard(aTokens, bTokens) {
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

// =========================
//  PREPARACIÓN DE ÍNDICES
// =========================
let variantMapExact = new Map(); // variante normalizada → { intent, respuesta }
let variantIndex = [];           // [{ intent, variante, tokens, respuesta }]
let fuse = null;

function buildIndexes() {
  variantMapExact = new Map();
  variantIndex = [];

  if (!clinicalCaseData?.respuestas) return;

  for (const [intent, data] of Object.entries(clinicalCaseData.respuestas)) {
    const variantes = Array.isArray(data.variantes) ? data.variantes : [];
    for (const v of variantes) {
      const norm = normalize(v);
      variantMapExact.set(norm, { intent, respuesta: data.respuesta });
      variantIndex.push({
        intent,
        variante: v,
        tokens: tokenize(v),
        respuesta: data.respuesta,
      });
    }
  }

  // Fuse como tercera capa
  const fuseList = Object.entries(clinicalCaseData.respuestas).map(([intent, data]) => ({
    intent,
    variantes: data.variantes,
    respuesta: data.respuesta,
  }));
  fuse = new Fuse(fuseList, {
    keys: ["variantes"],
    includeScore: true,
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });
}

buildIndexes();

// =========================
//  MATCHING ROBUSTO
// =========================
function splitQuestions(input) {
  // separa por ?, ., , y nexo " y / también / además"
  return normalize(input)
    .split(/\?+|\.|,| y | tambien | además | ademas/gi)
    .map(s => s.trim())
    .filter(Boolean);
}

function findBestAnswer(question) {
  const qNorm = normalize(question);
  const qTokens = tokenize(question);

  // 1) Coincidencia exacta de variante
  const exact = variantMapExact.get(qNorm);
  if (exact) return exact.respuesta;

  // 2) Coincidencia por similitud de tokens (Jaccard)
  //    Penalizamos variantes MUY cortas (tokens <= 1) y preferimos mayor similitud
  let bestToken = null;
  let bestScore = 0;
  for (const item of variantIndex) {
    if (!item.tokens || item.tokens.length === 0) continue;
    const score = jaccard(qTokens, item.tokens);
    // Bonus si comparten ≥2 tokens y la variante tiene ≥2 tokens
    const bonus = (score >= 0.5 && item.tokens.length >= 2 && qTokens.length >= 2) ? 0.05 : 0;
    const final = score + bonus;

    if (final > bestScore) {
      bestScore = final;
      bestToken = item;
    }
  }
  // Umbral razonable para evitar falsos positivos ("respiratoria" vs "respiracion" confuso)
  if (bestToken && bestScore >= 0.58) {
    return bestToken.respuesta;
  }

  // 3) Fuzzy con Fuse (último recurso local)
  if (fuse) {
    const results = fuse.search(qNorm);
    if (results.length) {
      // si hay match muy bueno lo tomamos
      const { item, score } = results[0];
      if (score <= 0.30) return item.respuesta;

      // si no es tan bueno, intentamos detectar coincidencia exacta entre variantes y la pregunta tokenizada
      const maybeExact = item.variantes?.find(
        v => normalize(v) === qNorm
      );
      if (maybeExact) return item.respuesta;
    }
  }

  // 4) Nada convincente: null → para que el caller decida fallback (Gemini) o "desconocido"
  return null;
}

// =========================
//  GEMINI (OPCIONAL)
// =========================
async function callGeminiAPI(pregunta) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" +
    apiKey;

  const prompt = `
Eres un paciente en un simulador clínico. Responde SOLO con la información disponible.
Datos del caso:
${JSON.stringify(clinicalCaseData, null, 2)}

Reglas:
- Si la pregunta coincide con una variante de las respuestas, responde con la "respuesta" correspondiente.
- Si NO hay información para responder, devuelve EXACTAMENTE: "${clinicalCaseData?.desconocido || "No entendí tu pregunta, ¿podés reformularla?"}".
- No inventes datos.

Pregunta del estudiante: "${pregunta}".
`;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 180 },
  };

  try {
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

// =========================
//  EVALUACIÓN
// =========================
function similarityText(a, b) {
  // Similaridad simple por Jaccard de tokens
  return jaccard(tokenize(a), tokenize(b));
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
  const correcto = best >= 0.72; // umbral razonable
  return { correcto, similitud: Number(best.toFixed(2)), referencia: correcto ? bestRef : null };
}

function parseTreatmentItems(textOrArray) {
  if (Array.isArray(textOrArray)) return textOrArray.map(t => normalize(t)).filter(Boolean);
  const text = String(textOrArray || "");
  // separa por comas, punto y coma, “ y ” y “ + ”
  return normalize(text)
    .split(/,|;| y | \+ /g)
    .map(s => s.trim())
    .filter(Boolean);
}

function evaluateTreatment(user, expectedList) {
  const userItems = parseTreatmentItems(user);
  const exp = (expectedList || []).map(normalize);

  const aciertos = [];
  const faltantes = [];
  const extras = [];

  // Matcheo flexible: si similitud ≥ 0.70 lo contamos como acierto
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

  const score =
    exp.length === 0 ? 1 : Math.max(0, Math.min(1, aciertos.length / exp.length));

  return {
    aciertos,
    faltantes,
    extras,
    puntaje: Number(score.toFixed(2)),
  };
}

// =========================
//  RUTAS
// =========================
app.get("/", (_req, res) => {
  res.send("✅ DxPro API (match robusto + evaluación) lista.");
});

app.get("/api/caso", (_req, res) => {
  if (!clinicalCaseData?.presentacion) {
    return res.status(500).json({ respuesta: "Error: caso no cargado." });
  }
  res.json({ respuesta: clinicalCaseData.presentacion });
});

app.post("/api/preguntar", async (req, res) => {
  if (!clinicalCaseData?.respuestas) {
    return res.status(500).json({
      respuestas: ["Error: no hay datos del caso."],
    });
  }

  const { pregunta } = req.body || {};
  if (!pregunta || !String(pregunta).trim()) {
    return res.status(400).json({ respuestas: ["Debe enviar una pregunta."] });
  }

  const subQs = splitQuestions(pregunta);
  const out = [];

  for (const q of subQs) {
    let ans = findBestAnswer(q);

    if (!ans) {
      // Si no hay respuesta convincente local → intentamos Gemini
      const ai = await callGeminiAPI(q);
      ans = ai || clinicalCaseData.desconocido || "No entendí tu pregunta, ¿podés reformularla?";
    }

    out.push(ans);
  }

  res.json({ respuestas: out });
});

// ----- Evaluación: diagnóstico y tratamiento -----
app.post("/api/evaluar", (req, res) => {
  const ev = clinicalCaseData?.evaluacion || {};
  const { diagnostico: diagUser, tratamiento: ttoUser } = req.body || {};

  const diagEsperado = Array.isArray(ev.diagnostico_presuntivo) ? ev.diagnostico_presuntivo : [];
  const ttoEsperado = Array.isArray(ev.tratamiento_inicial_esperado) ? ev.tratamiento_inicial_esperado : [];

  const diag = evaluateDiagnosis(diagUser || "", diagEsperado);
  const tto = evaluateTreatment(ttoUser || "", ttoEsperado);

  // Ponderación: 60% diagnóstico, 40% tratamiento
  const scoreDiag = diag.correcto ? 1 : Math.min(1, Math.max(0, diag.similitud));
  const total = Number((0.6 * scoreDiag + 0.4 * tto.puntaje).toFixed(2));

  const feedback = [];
  if (diag.correcto) {
    feedback.push(`✅ Diagnóstico: correcto (${diag.referencia}).`);
  } else {
    feedback.push(`❗Diagnóstico: no coincide con el esperado.`);
  }
  if (tto.aciertos.length) {
    feedback.push(`✅ Tratamiento: bien incluido → ${tto.aciertos.join(", ")}.`);
  }
  if (tto.faltantes.length) {
    feedback.push(`🧩 Te faltó mencionar → ${tto.faltantes.join(", ")}.`);
  }
  if (tto.extras.length) {
    feedback.push(`ℹ️ Ítems no esperados → ${tto.extras.join(", ")}.`);
  }

  res.json({
    puntaje: {
      diagnostico: Number((scoreDiag * 100).toFixed(0)),
      tratamiento: Number((tto.puntaje * 100).toFixed(0)),
      total: Number((total * 100).toFixed(0)),
    },
    diagnostico: diag,
    tratamiento: tto,
    feedback,
  });
});

// =========================
//  START
// =========================
app.listen(PORT, () => {
  console.log(`✅ API lista en http://localhost:${PORT}`);
});