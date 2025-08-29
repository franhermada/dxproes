import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const API_URL = "https://dxproes-backend.onrender.com";

  // 🔹 Cargar presentación inicial del caso
  useEffect(() => {
    const obtenerCaso = async () => {
      try {
        const res = await fetch(`${API_URL}/api/caso`);
        const data = await res.json();
        setMessages([{ texto: data.respuesta, autor: "bot" }]);
      } catch (error) {
        setMessages([{ texto: "⚠️ Error al cargar el caso clínico", autor: "bot" }]);
      }
    };

    obtenerCaso();
  }, []);

  // 🔹 Manejar envío de mensaje
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { texto: input, autor: "usuario" }]);
    setInput("");

    try {
      const respuesta = await fetch(`${API_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: input }),
      });

      if (!respuesta.ok) throw new Error("Servidor no disponible");

      const data = await respuesta.json();
      setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { texto: "⚠️ Error al conectar con el servidor. Reintentá en unos segundos.", autor: "bot" },
      ]);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: "url('/fondo.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg w-full max-w-2xl p-6 flex flex-col">
        
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-4">
          <img src="/DxPro.png" alt="DxPro Logo" className="logo mb-2" />
          <h1 className="text-2xl font-bold text-blue-900 text-center">BIENVENIDO A DXPRO</h1>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-3 border rounded bg-gray-50 flex flex-col">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className={`p-3 rounded-lg max-w-xs ${
                  msg.autor === "usuario"
                    ? "bg-blue-600 text-white self-end ml-auto"
                    : "bg-gray-200 text-gray-800 self-start"
                }`}
              >
                {msg.texto}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded"
            placeholder="Escribe tu pregunta al paciente..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}