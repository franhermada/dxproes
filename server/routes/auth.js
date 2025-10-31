import express from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import User from "../models/User.js";

const router = express.Router();

// Configuración de multer para subir PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Solo se permiten archivos PDF"));
  },
});

// Ruta de registro
router.post("/register", upload.single("certificate"), async (req, res) => {
  try {
    const { fullName, email, password, dni } = req.body;
    if (!fullName || !email || !password || !dni)
      return res.status(400).json({ error: "Faltan campos obligatorios" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "El correo ya está registrado" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullName,
      email,
      passwordHash,
      dni,
      certificatePath: req.file ? req.file.path : null,
    });

    await newUser.save();
    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

export default router;