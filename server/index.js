import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Usa process.env.PORT en Render, o 10000 como fallback local
const PORT = process.env.PORT || 10000; 

// 🔹 Permitir frontend local + Netlify + Render (ajusta estos orígenes según sea necesario)
app.use(
  cors({
    // Asegúrate de incluir la URL de tu frontend de Render/Netlify aquí
    origin: ["http://localhost:5173", "https://dxproes.netlify.app", "https://tu-frontend-de-render.onrender.com"], 
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

// --- Rutas de la API ---
// Ruta de prueba
app.get("/", (_req, res) => {
  res.send("✅ DxPro API corriendo en Render");
});

// 🔹 Presentación inicial del caso
app.get("/api/caso", (_req, res) => {
  if (clinicalCaseData && clinicalCaseData.presentacion) {
    res.json({ respuesta: clinicalCaseData.presentacion });
  } else {
    res.status(500).json({
      respuesta: "Error: el caso clínico no se pudo cargar.",
    });
  }
});

// 🔹 Preguntar al paciente (usa JSON local, no Gemini)
app.post("/api/preguntar", (req, res) => {
  const { pregunta } = req.body;

  if (!pregunta) {
    return res.status(400).json({ respuesta: "Debe enviar una pregunta." });
  }

  if (!clinicalCaseData || !clinicalCaseData.respuestas) {
    return res.status(500).json({
      respuesta: "Error: no hay datos del caso clínico disponibles.",
    });
  }

  // 🔎 Buscar coincidencia en variantes
  const lowerPregunta = pregunta.toLowerCase();
  let respuestaEncontrada = null;

  for (const clave in clinicalCaseData.respuestas) {
    const { variantes, respuesta } = clinicalCaseData.respuestas[clave];
    if (variantes.some((v) => lowerPregunta.includes(v))) {
      respuestaEncontrada = respuesta;
      break;
    }
  }

  if (respuestaEncontrada) {
    res.json({ respuesta: respuestaEncontrada });
  } else {
    res.json({ respuesta: clinicalCaseData.desconocido });
  }
});

// --- Iniciar servidor ---
app.listen(PORT, () =>
  console.log(`✅ API lista en http://localhost:${PORT}`)
);
