import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

// Cargar caso clínico desde archivo JSON
const caso1 = JSON.parse(fs.readFileSync("./casos/caso1.json", "utf-8"));

// Normalizar texto (pasar a minúsculas y sin acentos)
const normalizar = (texto) => {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// Buscar respuesta en el diccionario del caso
const encontrarRespuesta = (pregunta, respuestas) => {
  const preguntaNormalizada = normalizar(pregunta);

  for (const clave in respuestas) {
    const item = respuestas[clave];

    // ⚠️ Evitamos claves separadoras sin variantes/respuestas
    if (!item.variantes || !item.respuesta) continue;

    if (item.variantes.some(v => preguntaNormalizada.includes(normalizar(v)))) {
      return item.respuesta;
    }
  }
  return null;
};

// Endpoint inicial → presentación del caso
app.get("/api/caso", (req, res) => {
  res.json({ respuesta: caso1.presentacion });
});

// Endpoint para preguntas del usuario
app.post("/api/preguntar", (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) {
    return res.status(400).json({ respuesta: "⚠️ No se recibió la pregunta" });
  }

  const respuesta = encontrarRespuesta(pregunta, caso1.respuestas);

  if (respuesta) {
    res.json({ respuesta });
  } else {
    res.json({ respuesta: caso1.desconocido });
  }
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});