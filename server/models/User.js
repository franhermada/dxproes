import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  dni: { type: String, required: true },
  certificatePath: { type: String }, // ruta al PDF
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);