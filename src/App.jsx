import { useState, useEffect, useRef } from "react";
import "./App.css"; 
import "./index.css"; 

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const chatBoxRef = useRef(null); 

  const API_URL = "https://dxproes-backend.onrender.com"; 

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${BACKEND_URL}/`) 
        .then(() => console.log("✅ Ping enviado para mantener vivo el backend"))
        .catch(() => console.log("⚠️ Error al hacer ping"));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 🔹 Cargar presentación inicial del caso
  useEffect(() => {
    const obtenerCaso = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/caso`);
        const data = await res.json();
        setMessages([{ texto: data.respuesta, autor: "bot" }]);
      } catch (error) {
        setMessages([{ texto: "⚠️ Error al cargar el caso clínico inicial", autor: "bot" }]);
      } finally {
        setIsLoading(false);
      }
    };

    obtenerCaso();
  }, []);

  // 🔹 Scroll automático al final del chat cuando llegan nuevos mensajes
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);


  // 🔹 Manejar envío de mensaje del usuario
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return; // No enviar mensajes vacíos o si ya está cargando

    const userMessage = { texto: input.trim(), autor: "usuario" };
    
    // Crear el historial de chat que se enviará a Gemini.
    // Solo necesitamos los campos `autor` y `texto` para el contexto.
    const chatHistoryForGemini = messages.map(msg => ({
      autor: msg.autor,
      texto: msg.texto
    }));

    // Añadir el mensaje actual del usuario al historial para Gemini
    chatHistoryForGemini.push({ autor: userMessage.autor, texto: userMessage.texto });


    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true); // Activar estado de carga

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar-caso`, { // Nueva ruta
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: userMessage.texto, chatHistory: chatHistoryForGemini }),
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json();
        throw new Error(errorData.respuesta || "Error desconocido del servidor");
      }

      const data = await respuesta.json();

      setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setMessages(prev => [...prev, { texto: `⚠️ Error al conectar: ${error.message}`, autor: "bot" }]);
    } finally {
      setIsLoading(false); // Desactivar estado de carga
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center w-full p-4">
      <div className="bg-black/40 backdrop-blur-md rounded-xl shadow-lg w-full max-w-2xl p-6 flex flex-col chat-container">
        
        {/* Logo y título */}
        <div className="flex flex-col items-center mb-4 header">
          <img src="/DxPro.png" alt="DxPro Logo" className="logo w-24 h-24" />
          <h1 className="text-2xl font-bold text-white title">BIENVENIDO A DXPRO</h1>
        </div>

        {/* Chat */}
        <div ref={chatBoxRef} className="flex-1 overflow-y-auto space-y-3 mb-4 p-3 chat-box">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`message ${msg.autor} animate-fadeIn`}
            >
              {msg.texto}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                <span>Pensando...</span>
              </div>
            </div>
          )}
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
            disabled={isLoading} /* Deshabilitar input durante la carga */
          />
          <button
            onClick={handleSendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            disabled={isLoading} /* Deshabilitar botón durante la carga */
          >
            {isLoading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
