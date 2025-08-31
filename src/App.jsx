import { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const BACKEND_URL = "https://dxproes-backend.onrender.com";
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "auto" }); // instantáneo
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Ping backend
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/api/ping`).catch(() =>
        console.log("⚠️ Error al hacer ping")
      );
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Caso inicial
  useEffect(() => {
    const obtenerCaso = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/caso`);
        const data = await res.json();
        setMessages([{ texto: data.respuesta, autor: "bot" }]);
      } catch {
        setMessages([
          { texto: "⚠️ Error al cargar el caso clínico", autor: "bot" },
        ]);
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
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: input }),
      });
      const data = await respuesta.json();
      setMessages((prev) => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { texto: "⚠️ Error al conectar con el servidor", autor: "bot" },
      ]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar fija arriba */}
      <nav className="bg-black text-white py-4 px-8 flex justify-between items-center fixed w-full top-0 z-50">
        <div className="font-bold text-lg">DxPro</div>
        <div className="flex gap-8 font-semibold">
          <a href="#inicio" className="hover:text-blue-400">INICIO</a>
          <a href="#tutorial" className="hover:text-blue-400">TUTORIAL</a>
          <a href="#basicos" className="hover:text-blue-400">CASOS BÁSICOS</a>
          <a href="#avanzados" className="hover:text-blue-400">CASOS AVANZADOS</a>
          <a href="#contacto" className="hover:text-blue-400">CONTACTO</a>
        </div>
      </nav>

      {/* Fondo con imagen */}
      <div
        className="flex-1 flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: "url('/fondo.jpg')" }} // 👈 guarda tu imagen en public/fondo.jpg
      >
        {/* Contenedor del chat */}
        <div className="bg-black/60 backdrop-blur-md rounded-xl shadow-lg w-full max-w-2xl p-6 flex flex-col chat-container mt-24">
          {/* Logo y título */}
          <div className="flex flex-col items-center mb-4 header">
            <img src="/DxPro.png" alt="DxPro Logo" className="logo w-20 h-20" />
            <h1 className="text-2xl font-bold text-white title">
              BIENVENIDO A DXPRO
            </h1>
          </div>

          {/* Chat */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-3 chat-box">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message ${msg.autor} animate-fadeIn`}
              >
                {msg.texto}
              </div>
            ))}
            <div ref={chatEndRef} />
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
    </div>
  );
}