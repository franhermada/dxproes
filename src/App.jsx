import { useState, useEffect } from "react";
import "./App.css";
import "./index.css"; // estilos globales

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(" ");

  // Cargar presentación inicial del caso
  useEffect(() => {
    const obtenerCaso = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/caso");
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

    setMessages((prev) => [...prev, { texto: input, autor: "usuario" }]);
    setInput("");

    try {
      const respuesta = await fetch("http://localhost:3000/api/preguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: input }),
      });
      const data = await respuesta.json();
      setMessages((prev) => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { texto: "⚠️ Error al conectar con el servidor", autor: "bot" },
      ]);
    }
  };

  return (
    <div className="app-container">
      
      {/* 🔹 Header con logo y título */}
      <div className="header">
        <img src="/DxPro.png" alt="DxPro Logo" className="logo" />
        <h1 className="title">BIENVENIDO A DXPRO</h1>
      </div>

      {/* 🔹 Chat */}
      <div className="chat-container">
        <div className="chat-box">
          {messages.map((msg, i) => (
            <div key={i} className={`message fade-in ${msg.autor}`}>
              {msg.texto}
            </div>
          ))}
        </div>

        {/* 🔹 Input */}
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
  );
}