import express from "express";
import cors from "cors";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper para __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Variable para almacenar el caso clínico cargado
let clinicalCaseData = null;


const jsonFilePath = path.join(__dirname, 'casos', 'caso1.json');

try {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
  clinicalCaseData = JSON.parse(fileContent);
  console.log('✅ Archivo caso1.json cargado exitosamente.');
} catch (error) {
  console.error('❌ Error al cargar o parsear el archivo caso1.json:', error);
  // Si el archivo JSON es crítico, la aplicación podría no funcionar correctamente.
  // Podrías decidir salir del proceso: process.exit(1); 
}

// --- Funciones auxiliares para llamadas a la API de Gemini ---

async function callGeminiTextAPI(prompt, chatHistory = [], generationConfig = {}) {
  const updatedChatHistory = [...chatHistory, { role: "user", parts: [{ text: prompt }] }];

  const payload = {
    contents: updatedChatHistory,
    generationConfig: {
      temperature: 0.2, // Reducir temperatura para respuestas más directas y menos creativas
      maxOutputTokens: 500,
      ...generationConfig
    }
  };

  const apiKey = ""; 
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  let retries = 0;
  const maxRetries = 5;
  const baseDelay = 1000; 

  while (retries < maxRetries) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 429) { 
          const delay = baseDelay * Math.pow(2, retries) + Math.random() * 100;
          console.warn(`Demasiadas solicitudes a Gemini Text API. Reintentando en ${delay / 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retries++;
          continue;
        } else {
          const errorText = await response.text();
          throw new Error(`Error en la API de Gemini Text: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        return result.candidates[0].content.parts[0].text;
      } else {
        console.error('Estructura de respuesta inesperada de Gemini Text:', result);
        throw new Error("No se pudo obtener una respuesta válida de la IA (texto).");
      }

    } catch (error) {
      console.error('Error al llamar a la API de Gemini Text:', error);
      throw error;
    }
  }
  throw new Error("Fallo después de múltiples reintentos al llamar a la API de Gemini Text.");
}

// --- Rutas de la API ---

// Ruta de Bienvenida
app.get("/", (_req, res) => {
  res.send("DxPro API OK");
});

// Ruta para obtener la presentación inicial del caso
app.get("/api/caso", (req, res) => {
    if (clinicalCaseData && clinicalCaseData.presentacion) {
        res.json({ respuesta: clinicalCaseData.presentacion });
    } else {
        res.status(500).json({ respuesta: "Error: Caso clínico no cargado o sin presentación." });
    }
});


// Nueva ruta para procesar preguntas del usuario y obtener respuestas de la IA
app.post("/api/preguntar-caso", async (req, res) => {
  const { pregunta, chatHistory } = req.body; // El frontend enviará el historial completo

  if (!pregunta || !chatHistory) {
    return res.status(400).json({ respuesta: "Pregunta y chatHistory son requeridos." });
  }

  if (!clinicalCaseData) {
      return res.status(500).json({ respuesta: "Error: El caso clínico no se ha cargado en el servidor." });
  }

  try {
    // Construir el prompt para Gemini con todo el contexto
    const geminiPrompt = `
      Eres un paciente en un simulador clínico llamado DxPro. Tu nombre es Juan, tienes 55 años y consultaste por dolor torácico.
      El estudiante te está haciendo preguntas.
      Tienes un caso clínico predefinido con la siguiente información:
      ${JSON.stringify(clinicalCaseData.respuestas, null, 2)}

      El historial completo de la conversación hasta ahora es:
      ${chatHistory.map(msg => `${msg.autor === 'user' ? 'Estudiante' : 'Paciente'}: ${msg.texto}`).join('\n')}

      La última pregunta del estudiante es: "${pregunta}"

      Tu tarea es responder a la última pregunta del estudiante basándote *estrictamente* en la información proporcionada en el "clinicalCaseData.respuestas" y en tu rol de paciente.
      - Si la pregunta del estudiante coincide con alguna de las "variantes" de las claves del caso, da la "respuesta" correspondiente.
      - Si la pregunta no coincide con ninguna variante Y no puedes inferir una respuesta lógica directa de la información que tienes, responde exactamente: "${clinicalCaseData.desconocido}".
      - Mantén el tono de paciente o de profesional de la salud según la pregunta, pero siempre conciso.
      - No generes información nueva ni extiendas las respuestas más allá de lo estrictamente necesario.
      - Si te preguntan por estudios que requieren imágenes (ECG, radiografía), NO generes la imagen aquí, solo da la respuesta textual del JSON.
      - Evita cualquier saludo o despedida al inicio o final de la respuesta.
    `;

    const aiResponse = await callGeminiTextAPI(geminiPrompt, [], { temperature: 0.1 }); // Bajar temperatura para mayor precisión

    res.json({ respuesta: aiResponse });

  } catch (error) {
    console.error('Error en la ruta /api/preguntar-caso:', error);
    res.status(500).json({ respuesta: `Error interno del servidor: ${error.message}` });
  }
});

// Iniciar el servidor
app.listen(PORT, () => console.log(`✅ API lista en http://localhost:${PORT}`));
