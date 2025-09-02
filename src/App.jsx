import { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const [section, setSection] = useState("inicio");

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cargar presentación inicial solo en Casos Básicos
  useEffect(() => {
    if (section === "casos-basicos") {
      const obtenerCaso = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/caso`);
          const data = await res.json();
          setMessages([{ texto: data.respuesta, autor: "bot" }]);
        } catch {
          setMessages([{ texto: "⚠️ Error al cargar el caso clínico", autor: "bot" }]);
        }
      };
      obtenerCaso();
    } else {
      setMessages([]); // limpiar mensajes si cambio de sección
    }
  }, [section]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { texto: input, autor: "usuario" }]);
    const pregunta = input;
    setInput("");

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta }),
      });
      const data = await respuesta.json();

      if (Array.isArray(data.respuestas)) {
        setMessages(prev => [
          ...prev,
          ...data.respuestas.map(r => ({ texto: r, autor: "bot" }))
        ]);
      } else if (data.respuesta) {
        setMessages(prev => [...prev, { texto: data.respuesta, autor: "bot" }]);
      } else {
        setMessages(prev => [...prev, { texto: "⚠️ Respuesta no válida", autor: "bot" }]);
      }
    } catch {
      setMessages(prev => [...prev, { texto: "⚠️ Error al conectar con el servidor", autor: "bot" }]);
    }
  };

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/DxPro.png" alt="DxPro Logo" className="nav-logo" />
        </div>
        <div className="navbar-center">
          <button className="nav-btn" onClick={() => setSection("inicio")}>Inicio</button>
          <button className="nav-btn" onClick={() => setSection("tutorial")}>Tutorial</button>
          <button className="nav-btn" onClick={() => setSection("casos-basicos")}>Casos Básicos</button>
          <button className="nav-btn" onClick={() => setSection("casos-avanzados")}>Casos Avanzados</button>
          <button className="nav-btn" onClick={() => setSection("contacto")}>Contacto</button>
          <button className="nav-btn" onClick={() => setSection("colaborar")}>Colaborar</button>
        </div>
        <div className="navbar-right">
          <img src="/facultad.png" alt="Facultad Logo" className="nav-logo" />
        </div>
      </nav>

      {/* --- SECCIONES --- */}
      {section === "inicio" && (
        <div className="section card">
          <h1>Bienvenido a DxPro</h1>
          <p>
            Un simulador virtual de casos clínicos donde podrás desarrollar tus habilidades clinicomédicas. DxPro surge como parte de un proyecto de investigación sobre el uso de herramientas digitales (como IA) 
            en el desarrollo académico de estudiantes de Medicina y Enfermería, en la Facultad de Ciencias de la Salud 
            perteneciente a la Universidad Nacional del Centro de la Provincia de Buenos Aires.
          </p>
          <div className="inicio-logo-container">
            <img src="/DxPro.png" alt="DxPro Logo" className="inicio-logo" />
          </div>
        </div>
      )}

      {section === "tutorial" && (
        <div className="section card">
          <h2>Tutorial</h2>
          <ol className="tutorial-list">
            <li>Se le presentará un paciente al usuario, el cual deberá realizar una completa anamnesis basada en el motivo de consulta.</li>
            <li>Una vez considere que la anamnesis está finalizada, deberá pasar al examen físico donde deberá detallar qué maniobra realiza (Inspección visual, auscultación cardíaca, auscultación pulmonar, palpación, etc).</li>
            <li>Cuando el examen físico esté finalizado, continuará con los exámenes complementarios. En la versión básica, el sistema arrojará directamente el resultado del estudio solicitado; mientras que en la versión avanzada, el sistema proporcionará el estudio solicitado y el usuario deberá analizar si se hallan anomalías.</li>
            <li>Finalmente, en base a la anamnesis, el examen físico y los estudios complementarios, el usuario deberá dar un diagnóstico presuntivo del paciente. En la versión avanzada, también se agregará tratamiento (tanto farmacológico, como no farmacológico).</li>
          </ol>
        </div>
      )}

      {section === "casos-basicos" && (
        <div className="section card">
          <h2>Casos Básicos</h2>
          <p>Casos de baja complejidad con resultado directo de los estudios complementarios solicitados.</p>

          <div className="chat-wrapper">
            <div className="chat-card">
              <div className="chat-header">
                <img src="/DxPro.png" alt="DxPro Logo" className="logo-chat" />
                <h1 className="chat-title">Simulación de Caso</h1>
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
        </div>
      )}

      {section === "casos-avanzados" && (
        <div className="section card">
          <h2>Casos Avanzados</h2>
          <p>
            Casos de mayor complejidad, donde el usuario deberá hacer la interpretación de los estudios complementarios
            por su propia cuenta.
          </p>
        </div>
      )}

      {section === "contacto" && (
        <div className="section card">
          <h2>Contacto</h2>
          <p>Escribinos a <b>dxproes@gmail.com</b></p>
        </div>
      )}

      {section === "colaborar" && (
        <div className="section card">
          <h2>Colaborar con DxPro</h2>
          <p>
            DxPro es un proyecto <b>100% gratuito</b>, desarrollado para estudiantes de Medicina y Enfermería.
            No tiene fines de lucro: todo el contenido es libre y abierto.
          </p>
          <p>
            Si te resulta útil y querés apoyar el mantenimiento y el desarrollo de nuevos casos clínicos,
            podés colaborar invitandome un cafecito ☕
          </p>
          <a
            href="https://cafecito.app/dxproes"
            target="_blank"
            rel="noopener noreferrer"
            className="donate-button"
          >
            ☕ Colaborar en Cafecito
          </a>
        </div>
      )}
    </div>
  );
}