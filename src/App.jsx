import { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // 🔹 Mantener backend vivo (ping cada 4 min)
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/api/ping`)
        .then(() => console.log("✅ Ping enviado para mantener vivo el backend"))
        .catch(() => console.log("⚠️ Error al hacer ping"));
    }, 240000);

    return () => clearInterval(interval);
  }, []);

  // 🔹 Cargar presentación inicial
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

  // 🔹 Scroll automático al final
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // 🔹 Enviar mensaje
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
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { texto: "⚠️ Error al conectar con el servidor", autor: "bot" },
      ]);
    }
  };

  return (
    <div className="min-h-screen w-full bg-cover bg-center">
      {/* 🔹 Navbar */}
      <Navbar />

      {/* 🔹 Sección del Chat */}
      <div id="chat" className="flex items-center justify-center w-full pt-28">
        <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg w-full max-w-4xl p-6 flex flex-col chat-container">
          {/* Logo + título */}
          <div className="flex flex-col items-center mb-4 header">
            <img src="/DxPro.png" alt="DxPro Logo" className="w-20 h-20 mb-2" />
            <h1 className="text-2xl font-bold text-blue-900">
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

      {/* 🔹 Sección Tutorial */}
      <div id="tutorial" className="p-10 text-center text-gray-800">
        <h2 className="text-3xl font-bold mb-4 text-blue-800">Tutorial</h2>
        <p className="text-lg max-w-3xl mx-auto">
          Aquí irán los pasos explicativos para que el estudiante aprenda cómo
          interactuar con el paciente virtual. Explicá cómo iniciar la anamnesis,
          qué tipo de preguntas hacer y cómo interpretar las respuestas.
        </p>
      </div>

      {/* 🔹 Sección Inicio */}
      <div id="about" className="p-10 text-center text-gray-800 bg-blue-50">
        <h2 className="text-3xl font-bold mb-4 text-blue-800">Sobre DxPro</h2>
        <p className="text-lg max-w-3xl mx-auto">
          Bienvenidos a DxPro, un simulador virtual de casos clínicos donde podrás desarrollar tus habilidades clinicomédicas. 
          La idea surge como parte de un proyecto de investigación sobre el uso de herramientas digitales (como IA) 
          en el desarrollo académico de estudiantes de Medicina y Enfermería, en la Facultad de Ciencias de la Salud 
          perteneciente a la Universidad Nacional del Centro de la Provincia de Buenos Aires.
        </p>
      </div>
    </div>
  );
}