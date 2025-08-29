import { useState, useEffect } from "react";
import "./App.css"; // Tus estilos específicos del componente
import "./index.css"; // Estilos globales, incluyendo el fondo

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(""); // Inicializado como cadena vacía para evitar espacios extra

  // URL del backend en Render
  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // 🔹 Mantener vivo el backend (ping cada 4 min aprox)
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/api/ping`)
        .then(() => console.log("✅ Ping enviado para mantener vivo el backend"))
        .catch(() => console.log("⚠️ Error al hacer ping"));
    }, 240000); // 4 minutos

    return () => clearInterval(interval);
  }, []);

  // 🔹 Cargar presentación inicial del caso
  useEffect(() => {
    const obtenerCaso = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/caso`);
        const data = await res.json();
        setMessages([{ texto: data.respuesta, autor: "bot" }]);
      } catch (error) {
        setMessages([{ texto: "⚠️ Error al cargar el caso clínico", autor: "bot" }]);
      }
    };

    obtenerCaso();
  }, []);

  // 🔹 Manejar envío de mensaje del usuario
  const handleSendMessage = async () => {
    if (!input.trim()) return; // No enviar mensajes vacíos

    // Añadir mensaje del usuario inmediatamente al historial
    setMessages(prev => [...prev, { texto: input, autor: "usuario" }]);
    setInput(""); // Limpiar el input

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: input }),
      });

      const data = await respuesta.json();

      // Añadir respuesta del bot al historial
      setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch (error) {
      setMessages(prev => [...prev, { texto: "⚠️ Error al conectar con el servidor", autor: "bot" }]);
    }
  };

  return (
    // El contenedor principal ya no necesita estilos de fondo si el body los maneja
    // Eliminamos el `style` inline aquí para que `index.css` lo controle
    <div className="min-h-screen flex items-center justify-center w-full"> {/* Este div centra el contenido de la app */}
      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-lg w-full max-w-2xl p-6 flex flex-col chat-container">
        
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-4 header"> {/* Clase header para estilos */ }
          <img src="/DxPro.png" alt="DxPro Logo" className="logo w-24 h-24" />
          <h1 className="text-2xl font-bold text-white title">BIENVENIDO A DXPRO</h1>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-3 chat-box"> {/* Clase chat-box para estilos */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message ${msg.autor} animate-fadeIn`} // Clases 'message' y autor para burbujas
            >
              {msg.texto}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 input-area"> {/* Clase input-area para estilos */}
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
