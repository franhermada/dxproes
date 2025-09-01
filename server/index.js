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
    origin: ["http://localhost:5173", "https://dxproes.netlify.app"],
  })
);
app.use(express.json());

// --- Cargar el caso clínico ---
let clinicalCaseData = null;
const jsonFilePath = path.join(__dirname, "casos", "caso1.json");

console.log(`[DEBUG] Intentando cargar el archivo JSON desde: ${jsonFilePath}`);

try {
  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(`El archivo no existe: ${jsonFilePath}`);
  }
  const fileContent = fs.readFileSync(jsonFilePath, "utf8");
  clinicalCaseData = JSON.parse(fileContent);
  console.log("✅ Archivo caso1.json cargado exitosamente.");
} catch (error) {
  console.error("❌ ERROR: No se pudo cargar caso1.json.");
  console.error(error.message);
}

// --- Preparar Fuse.js ---
let fuse = null;
if (clinicalCaseData?.respuestas) {
  const list = Object.entries(clinicalCaseData.respuestas).map(
    ([intent, data]) => ({
      intent,
      variantes: data.variantes,
      respuesta: data.respuesta,
    })
  );
  fuse = new Fuse(list, {
    keys: ["variantes"],
    threshold: 0.35,
    ignoreLocation: true,
  });
}

// --- Helpers ---
function normalizar(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "");
}

function dividirPreguntas(input) {
  return input
    .split(/y|,|\.|\?|ademas|tambien/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

// --- Gemini fallback ---
async function callGeminiAPI(pregunta, clinicalCaseData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Falta la GEMINI_API_KEY en variables de entorno");

  const apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=" +
    apiKey;

  const prompt = `
  Eres un paciente en un simulador clínico. Tu información es la siguiente:
  ${JSON.stringify(clinicalCaseData, null, 2)}

  Responde estrictamente en base a los datos anteriores.
  - Si la pregunta coincide o se relaciona con alguna variante, responde con la respuesta correspondiente.
  - Si no podés responder con la información disponible, decí exactamente: "${clinicalCaseData.desconocido}".
  - Mantené siempre el rol de paciente y no inventes datos.
  Pregunta del estudiante: "${pregunta}".
  `;

  const payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
  };

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (data.candidates && data.candidates[0].content.parts[0].text) {
    return data.candidates[0].content.parts[0].text.trim();
  } else {
    return clinicalCaseData.desconocido;
  }
}

// --- Rutas ---
app.get("/", (_req, res) => {
  res.send("✅ DxPro API corriendo en Render con Fuse.js + Gemini");
});

app.get("/api/caso", (_req, res) => {
  if (clinicalCaseData && clinicalCaseData.presentacion) {
    res.json({ respuesta: clinicalCaseData.presentacion });
  } else {
    res.status(500).json({
      respuesta: "Error: el caso clínico no se pudo cargar.",
    });
  }
});

app.post("/api/preguntar", async (req, res) => {
  const { pregunta } = req.body;

  if (!pregunta) {
    return res.status(400).json({ respuestas: ["Debe enviar una pregunta."] });
  }

  if (!clinicalCaseData || !clinicalCaseData.respuestas) {
    return res.status(500).json({
      respuestas: ["Error: no hay datos del caso clínico disponibles."],
    });
  }

  const normalizada = normalizar(pregunta);
  const subPregs = dividirPreguntas(normalizada);
  let respuestas = [];

  try {
    for (const sub of subPregs) {
      let respuesta = null;

      if (fuse) {
        const results = fuse.search(sub);
        if (results.length && results[0].score <= 0.4) {
          respuesta = results[0].item.respuesta;
        }
      }

      if (!respuesta) {
        // fallback con Gemini
        respuesta = await callGeminiAPI(sub, clinicalCaseData);
      }

      respuestas.push(respuesta || clinicalCaseData.desconocido);
    }

    res.json({ respuestas });
  } catch (error) {
    console.error("Error en /api/preguntar:", error.message);
    res.status(500).json({
      respuestas: ["⚠️ Error al conectar con el servidor. Probá de nuevo."],
    });
  }
});

// --- Iniciar servidor ---
app.listen(PORT, () =>
  console.log(`✅ API lista en http://localhost:${PORT}`)
);
