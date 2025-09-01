import { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Scroll automático al último mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  // Cargar presentación inicial
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

  // Scroll a sección
  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <button className="nav-btn" onClick={() => scrollToSection("inicio")}>Inicio</button>
        <button className="nav-btn" onClick={() => scrollToSection("tutorial")}>Tutorial</button>
        <button className="nav-btn" onClick={() => scrollToSection("casos-basicos")}>Casos Básicos</button>
        <button className="nav-btn" onClick={() => scrollToSection("casos-avanzados")}>Casos Avanzados</button>
        <button className="nav-btn" onClick={() => scrollToSection("sobre-dxpro")}>Sobre DxPro</button>
        <button className="nav-btn" onClick={() => scrollToSection("contacto")}>Contacto</button>
      </nav>

      {/* --- SECCIONES --- */}
      <section id="inicio" className="section">
        <div className="chat-wrapper">
          <div className="chat-card">
            <div className="chat-header">
              <img src="/DxPro.png" alt="DxPro Logo" className="logo-chat" />
              <h1 className="chat-title">DxPro - Simulador Clínico</h1>
            </div>

            <div className="chat-box">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.autor}`}>
                  {msg.texto}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

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
      </section>

      <section id="tutorial" className="section">
        <h2>Tutorial</h2>
        <p>Aquí irá la explicación de cómo usar DxPro paso a paso.</p>
      </section>

      <section id="casos-basicos" className="section">
        <h2>Casos Básicos</h2>
        <p>Casos gratuitos con feedback directo y estudios complementarios.</p>
      </section>

      <section id="casos-avanzados" className="section">
        <h2>Casos Avanzados</h2>
        <p>Casos de pago, con audios de auscultación, imágenes y más interacción clínica.</p>
      </section>

      <section id="sobre-dxpro" className="section">
        <h2>Sobre DxPro</h2>
        <p>DxPro es una herramienta educativa diseñada para simular entrevistas clínicas.</p>
      </section>

      <section id="contacto" className="section">
        <h2>Contacto</h2>
        <p>Escribinos a <b>dxpro.contacto@gmail.com</b></p>
      </section>
    </div>
  );
}