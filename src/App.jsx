import { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Scroll automático hacia abajo (instantáneo)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // Presentación inicial
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

  // Enviar mensaje
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
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <img src="/DxPro.png" alt="DxPro Logo" className="logo-navbar" />
        <h1 className="navbar-title">DxPro - Simulador Clínico</h1>
      </nav>

      {/* CHAT */}
      <div className="chat-wrapper">
        <div className="chat-card">
          <div className="chat-box">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.autor}`}>
                {msg.texto}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <input
              type="text"
              placeholder="Escribe tu pregunta al paciente..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}