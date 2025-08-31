import { useState, useEffect, useRef } from "react";
import Navbar from "./Navbar"; // Asegúrate de que la ruta sea correcta
import "./App.css"; // Para estilos generales y de burbujas
import "./index.css"; // Para Tailwind CSS y estilos base

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Para deshabilitar input durante la carga
  const chatBoxRef = useRef(null); // Referencia para el scroll automático del chat

  // URL del backend (asegúrate de que esta sea la URL de tu Render backend)
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://dxproes-backend.onrender.com";

  // Efecto para scroll automático al final del chat
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  // Ping al backend para mantenerlo activo
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/`)
        .then(() => console.log("✅ Ping enviado para mantener vivo el backend"))
        .catch(() => console.warn("⚠️ Error al hacer ping al backend (posiblemente inactivo o error de red)"));
    }, 240000); // Cada 4 minutos

    return () => clearInterval(interval);
  }, [BACKEND_URL]);

  // Cargar presentación inicial del caso
  useEffect(() => {
    const obtenerCaso = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/caso`);
        if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
        const data = await res.json();
        setMessages([{ texto: data.respuesta, autor: "bot" }]);
      } catch (error) {
        console.error("❌ Error al obtener caso inicial:", error);
        setMessages([{ texto: "⚠️ No pude conectar con el servidor para cargar el caso inicial. Por favor, reintentá en unos segundos.", autor: "bot" }]);
      } finally {
        setIsLoading(false);
      }
    };
    obtenerCaso();
  }, [BACKEND_URL]);

  // Manejar envío de mensaje del usuario
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageText = input.trim();
    setMessages(prev => [...prev, { texto: userMessageText, autor: "usuario" }]);
    setInput("");
    setIsLoading(true); // Deshabilita el input mientras espera la respuesta

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: userMessageText }),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json(); // Intentar leer el error del backend
        throw new Error(errorData.respuesta || `Error HTTP: ${respuesta.status}`);
      }

      const data = await respuesta.json();
      setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);

    } catch (error) {
      console.error("❌ Error al enviar mensaje:", error);
      // Reintento automático si falla la primera vez (común si Render está "dormido")
      setTimeout(async () => {
        try {
          const retry = await fetch(`${BACKEND_URL}/api/preguntar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pregunta: userMessageText }),
          });
          if (retry.ok) {
            const data = await retry.json();
            setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
            return;
          }
        } catch (retryError) {
          console.error("⚠️ Segundo intento fallido:", retryError);
        }
        // Si el retry también falla, muestra el mensaje de error
        setMessages(prev => [...prev, { texto: `⚠️ Error al conectar con el servidor. ${error.message || 'Por favor, volvé a intentar.'}`, autor: "bot" }]);
      }, 3000); // Espera 3 segundos y reintenta
    } finally {
      setIsLoading(false); // Habilita el input de nuevo
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center pt-16"> {/* pt-16 para Navbar */}
      <Navbar /> {/* El Navbar se renderiza aquí */}

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg shadow-xl p-6 flex flex-col" style={{ minHeight: '80vh', maxHeight: '90vh' }}>
        
        {/* Logo y Título */}
        <div className="flex flex-col items-center mb-4">
          <img src="/DxPro.png" alt="DxPro Logo" className="w-24 h-24 mb-2" />
          <h1 className="text-3xl font-extrabold text-gray-800 text-center">BIENVENIDO A DXPRO</h1>
          <p className="text-gray-600 text-center mt-1">Simulador de Casos Clínicos</p>
        </div>

        {/* Área del Chat con scroll automático */}
        <div ref={chatBoxRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg border border-gray-200 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.autor === 'usuario' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-xl shadow-md text-white ${msg.autor === 'usuario' ? 'bg-blue-500 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                {msg.texto}
              </div>
            </div>
          ))}
        </div>

        {/* Área de Input */}
        <div className="flex gap-3 mt-4">
          <input
            type="text"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            placeholder={isLoading ? "Esperando respuesta..." : "Escribe tu pregunta al paciente..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}