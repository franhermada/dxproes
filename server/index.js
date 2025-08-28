import express from "express";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const caso = JSON.parse(fs.readFileSync("./casos/caso1.json", "utf-8"));

app.get("/api/caso", (req, res) => {
  res.json({ respuesta: caso.presentacion });
});

app.post("/api/preguntar", (req, res) => {
  const pregunta = req.body.pregunta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // quita acentos

  let respuesta = caso.desconocido;

  for (const key in caso.respuestas) {
    const { variantes, respuesta: rta } = caso.respuestas[key];
    if (variantes.some(v => pregunta.includes(v))) {
      respuesta = rta;
      break;
    }
  }

  res.json({ respuesta });
});

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});