import { useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);
  const chatScrollRef = useRef(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Mantener vivo el backend gratis
  useEffect(() => {
    const t = setInterval(() => {
      fetch(`${BACKEND_URL}/api/ping`).catch(() => {});
    }, 240000);
    return () => clearInterval(t);
  }, []);

  // Presentación inicial
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/caso`);
        const d = await r.json();
        setMessages([{ texto: d.respuesta, autor: "bot" }]);
      } catch {
        setMessages([{ texto: "⚠️ Error al cargar el caso clínico", autor: "bot" }]);
      }
    })();
  }, []);

  // Scroll SIEMPRE al final (anclado abajo)
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  const handleSendMessage = async () => {
    const q = input.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { texto: q, autor: "usuario" }]);
    setInput("");

    try {
      const resp = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: q }),
      });
      const data = await resp.json();
      setMessages((prev) => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { texto: "⚠️ Error al conectar con el servidor", autor: "bot" },
      ]);
    }
  };

  return (
    <div id="inicio" className="min-h-screen w-full">
      {/* NAVBAR */}
      <Navbar />

      {/* Chat centrado */}
      <div className="flex items-start justify-center w-full pt-24 pb-10 px-4">
        <div className="chat-card bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-4xl p-6 flex flex-col">
          {/* Logo + título */}
          <div className="flex flex-col items-center mb-5">
            <img
              src="/DxPro.png"
              alt="DxPro Logo"
              className="logo-small mb-2"
            />
            <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900 tracking-wide">
              BIENVENIDO A DXPRO
            </h1>
          </div>

          {/* Chat */}
          <div
            ref={chatScrollRef}
            className="chat-box flex-1 overflow-y-auto space-y-3 mb-4 p-3"
          >
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.autor}`}>{m.texto}</div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Escribe tu pregunta al paciente..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 active:scale-[.98] transition"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}