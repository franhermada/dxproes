import { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Scroll automático instantáneo al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

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

      const data = await respuesta.json();
      setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch (error) {
      setMessages(prev => [...prev, { texto: "⚠️ Error al conectar con el servidor", autor: "bot" }]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center w-full">
      <div className="chat-card w-full max-w-2xl p-6 flex flex-col">
        
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-4">
          <img src="/DxPro.png" alt="DxPro Logo" className="logo-small" />
          <h1 className="text-2xl font-bold text-blue-900">BIENVENIDO A DXPRO</h1>
        </div>

        {/* Chat */}
        <div className="chat-box space-y-3 mb-4 p-3">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.autor}`}>
              {msg.texto}
            </div>
          ))}
          <div ref={chatEndRef} />
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