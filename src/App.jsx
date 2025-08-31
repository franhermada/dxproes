import { useState, useEffect } from "react";
import "./App.css"; 
import "./index.css"; 

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://dxproes-backend.onrender.com";

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔹 Mantener vivo el backend (ping cada 30 seg aprox)
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/`) // Ping a la raíz para mantenerlo activo
        .then(() => console.log("✅ Ping enviado para mantener vivo el backend"))
        .catch(() => console.log("⚠️ Error al hacer ping (pero no rompe)"));
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, []);

  // 🔹 Cargar presentación inicial del caso
  useEffect(() => {
    const obtenerCaso = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/caso`);
        if (!res.ok) throw new new Error(`Error HTTP: ${res.status}`);
        const data = await res.json();
        setMessages([{ texto: data.respuesta, autor: "bot" }]);
      } catch (error) {
        console.error("❌ Error al obtener caso:", error);
        setMessages([{ texto: "⚠️ No pude conectar con el servidor. Reintentá en unos segundos.", autor: "bot" }]);
      }
    };

    obtenerCaso();
  }, []);

  // 🔹 Manejar envío de mensaje del usuario
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { texto: input, autor: "usuario" }]);
    setInput("");

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: input }),
      });

      if (!respuesta.ok) {
        throw new new Error(`Error HTTP: ${respuesta.status}`);
      }

      const data = await respuesta.json();
      setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch (error) {
      console.error("❌ Error al preguntar:", error);

      // 🔄 Retry automático si Render estaba dormido
      setTimeout(async () => {
        try {
          const retry = await fetch(`${BACKEND_URL}/api/preguntar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pregunta: input }),
          });
          if (retry.ok) {
            const data = await retry.json();
            setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
            return;
          }
        } catch (retryError) {
          console.error("⚠️ Retry fallido:", retryError);
        }

        setMessages(prev => [...prev, { texto: "⚠️ Error al conectar con el servidor. Volvé a intentar.", autor: "bot" }]);
      }, 3000); // espera 3s y reintenta
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center w-full">
      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-lg w-full max-w-2xl p-6 flex flex-col chat-container">
        
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-4 header">
          <img src="/DxPro.png" alt="DxPro Logo" className="logo w-24 h-24" />
          <h1 className="text-2xl font-bold text-white title">BIENVENIDO A DXPRO</h1>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-3 chat-box">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.autor} animate-fadeIn`}>
              {msg.texto}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 input-area">
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
