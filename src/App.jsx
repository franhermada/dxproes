import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatBoxRef = useRef(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Efecto para scroll automático al final del chat
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Cargar presentación inicial del caso
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
    <>
      <Navbar /> {/* Renderiza el navbar en la parte superior */}
      <div className="flex justify-center items-center min-h-screen pt-16 px-4 pb-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 flex flex-col" style={{ minHeight: '80vh', maxHeight: '90vh' }}>
          
          {/* Logo y título */}
          <div className="flex flex-col items-center mb-4">
            <img src="/DxPro.png" alt="DxPro Logo" className="w-24 h-24 mb-2" />
            <h1 className="text-3xl font-bold text-gray-800">BIENVENIDO A DXPRO</h1>
          </div>
  
          {/* Área del Chat con scroll automático */}
          <div ref={chatBoxRef} className="flex-1 overflow-y-auto space-y-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-xl shadow-md text-white ${msg.autor === 'usuario' ? 'bg-blue-500 rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                  {msg.texto}
                </div>
              </div>
            ))}
          </div>
  
          {/* Input */}
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Escribe tu pregunta al paciente..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}