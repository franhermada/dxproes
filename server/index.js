import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 10000; 

app.use(
  cors({
    
    origin: ["http://localhost:5173", "https://dxproes.netlify.app", "https://dxproes-backend.onrender.com/api/caso"], 
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

app.get("/", (_req, res) => {
  res.send("✅ DxPro API corriendo en Render");
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

app.listen(PORT, () =>
  console.log(`✅ API lista en http://localhost:${PORT}`)
);
