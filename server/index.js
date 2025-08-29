import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Endpoint "ping" para mantener vivo Render
app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "Servidor activo 🚀" });
});

// 🔹 Endpoint inicial del caso
app.get("/api/caso", (req, res) => {
  const casoPath = path.join(process.cwd(), "casos", "caso1.json");
  const data = JSON.parse(fs.readFileSync(casoPath, "utf8"));
  res.json({ respuesta: data.presentacion });
});

// 🔹 Endpoint de preguntas
app.post("/api/preguntar", (req, res) => {
  const { pregunta } = req.body;

  // Acá va la lógica de tu diccionario
  // ejemplo simple:
  if (pregunta.toLowerCase().includes("nombre")) {
    return res.json({ respuesta: "Me llamo Juan." });
  }

  res.json({ respuesta: "No entendí tu pregunta, ¿podés reformularla?" });
});

// 🔹 Puerto dinámico para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en puerto ${PORT}`);
});