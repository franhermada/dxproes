import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const SYSTEMS = [
  { id: "cardiovascular", label: "Cardiovascular" },
  { id: "respiratorio", label: "Respiratorio" },
  { id: "renal", label: "Renal" },
  { id: "digestivo", label: "Digestivo" },
  { id: "endocrino", label: "Endocrino" },
  { id: "todos", label: "Todos" }
];

function App() {
  const [section, setSection] = useState("inicio");
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [caseData, setCaseData] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [loadingCase, setLoadingCase] = useState(false);
  const chatEndRef = useRef(null);

  const [showEvaluation, setShowEvaluation] = useState(false);
  const [diagnosticoInput, setDiagnosticoInput] = useState("");
  const [tratamientoInput, setTratamientoInput] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);

  // Scroll automático del chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Obtener un caso cuando se selecciona un sistema
  useEffect(() => {
    if (section === "casos-basicos" && selectedSystem) {
      const obtenerCaso = async () => {
        try {
          setLoadingCase(true);
          const qs =
            selectedSystem === "todos"
              ? "?system=all"
              : `?system=${encodeURIComponent(selectedSystem)}`;
          const res = await fetch(`${BACKEND_URL}/api/caso${qs}`);
          const data = await res.json();
          setCaseId(data.casoId);
          setCaseData(data);
          const presentacion = data.presentacion || data.respuesta;
          setMessages([{ texto: presentacion, autor: "bot" }]);
        } catch {
          setMessages([
            { texto: "⚠️ Error al cargar el caso clínico", autor: "bot" }
          ]);
        } finally {
          setLoadingCase(false);
        }
      };
      obtenerCaso();
    } else {
      setMessages([]);
      setCaseId(null);
      setCaseData(null);
      setShowEvaluation(false);
      setEvaluationResult(null);
    }
  }, [section, selectedSystem]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { texto: input, autor: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: input, caseId }),
      });
      const data = await res.json();
      const botMessage = { texto: data.respuesta, autor: "bot" };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { texto: "⚠️ Error al procesar la pregunta", autor: "bot" },
      ]);
    }
  };

  // Evaluación
  const handleEvaluation = async () => {
    try {
      if (!caseId) {
        setEvaluationResult({
          diagnosticoOk: false,
          correctos: [],
          faltantes: [],
          incorrectos: [],
          feedback: ["Error: caseId no definido. Volvé a seleccionar un caso."]
        });
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostico: diagnosticoInput,
          tratamiento: tratamientoInput,
          caseId
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Servidor respondió ${res.status}: ${text}`);
      }

      const data = await res.json();

      const evalResult = {
        diagnosticoOk: data.diagnostico?.correcto ?? false,
        correctos: data.tratamiento?.aciertos ?? [],
        faltantes: data.tratamiento?.faltantes ?? [],
        incorrectos: data.tratamiento?.extras ?? [],
        feedback: data.feedback ?? [],
        puntaje: data.puntaje ?? null,
      };

      setEvaluationResult(evalResult);
      setShowEvaluation(false);
    } catch (err) {
      setEvaluationResult({
        diagnosticoOk: false,
        correctos: [],
        faltantes: [],
        incorrectos: [],
        feedback: [`Error al evaluar: ${err.message}`]
      });
    }
  };

  const handleBackToSystems = () => {
    setSelectedSystem(null);
    setCaseId(null);
    setCaseData(null);
    setMessages([]);
    setShowEvaluation(false);
    setEvaluationResult(null);
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/DxPro.png" alt="DxPro Logo" className="logo" />
          <img src="/facultad.png" alt="Facultad Logo" className="logo-facultad" />
        </div>
        <div className="navbar-center">
          <button onClick={() => setSection("inicio")}>Inicio</button>
          <button onClick={() => setSection("tutorial")}>Tutorial</button>
          <button onClick={() => setSection("casos-basicos")}>Casos Básicos</button>
          <button onClick={() => setSection("casos-avanzados")}>Casos Avanzados</button>
          <button onClick={() => setSection("contacto")}>Contacto</button>
          <button onClick={() => setSection("colaborar")} className="colaborar-btn">
            🤝 Colaborar
          </button>
        </div>
      </nav>

      <main>
        {section === "inicio" && (
          <div className="section card">
            <h1>Bienvenido a DxPro</h1>
            <p>Plataforma interactiva para el repaso de casos clínicos.</p>
          </div>
        )}

        {section === "tutorial" && (
          <div className="section card">
            <h2>Cómo usar DxPro</h2>
            <p>
              En la sección de Casos Básicos podés interactuar con un chatbot que simula un paciente.
              Realizá preguntas para obtener información de anamnesis, examen físico, laboratorio, imágenes y más.
            </p>
            <p>
              En Casos Avanzados tendrás acceso a material más realista (imágenes sin descripciones, sonidos de auscultación, etc.).
            </p>
            <p>
              Al finalizar cada caso, podrás ingresar tu diagnóstico y plan de tratamiento para recibir una devolución personalizada.
            </p>
          </div>
        )}

        {section === "casos-basicos" && (
          <div className="section card">
            <h2>Casos Básicos</h2>

            {!selectedSystem ? (
              <div className="systems-grid">
                <h3>Seleccioná un sistema</h3>
                <div className="systems-list">
                  {SYSTEMS.map((s) => (
                    <button
                      key={s.id}
                      className="system-card"
                      onClick={() => setSelectedSystem(s.id)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : loadingCase ? (
              <div className="loading-card">
                <p>⏳ Espere mientras cargamos su caso clínico...</p>
              </div>
            ) : (
              <div className="chat-wrapper">
                <div className="chat-card">
                  <div className="chat-header">
                    <img src="/DxPro.png" alt="DxPro Logo" className="logo-chat" />
                    <h1 className="chat-title">Simulación de Caso</h1>
                    <button className="mini-btn" onClick={handleBackToSystems}>
                      ← Volver a sistemas
                    </button>
                  </div>

                  <div className="chat-box">
                    {messages.map((msg, i) => (
                      <div key={i} className={`message ${msg.autor}`}>
                        {msg.texto}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {!showEvaluation && !evaluationResult && (
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
                  )}

                  {caseData && !showEvaluation && !evaluationResult && (
                    <button 
                      className="finalizar-btn" 
                      onClick={() => setShowEvaluation(true)}
                    >
                      Finalizar Caso
                    </button>
                  )}

                  {showEvaluation && !evaluationResult && (
                    <div className="evaluacion-form">
                      <h3>Evaluación del Caso</h3>
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleEvaluation();
                        }}
                      >
                        <label>Diagnóstico Presuntivo:</label>
                        <input 
                          type="text" 
                          value={diagnosticoInput} 
                          onChange={(e) => setDiagnosticoInput(e.target.value)} 
                          placeholder="Coloque aquí su diagnóstico..."
                        />

                        <label>Tratamiento Inicial:</label>
                        <textarea
                          rows="3"
                          value={tratamientoInput}
                          onChange={(e) => setTratamientoInput(e.target.value)}
                          placeholder="Coloque aquí los tratamientos separados por comas..."
                        />

                        <button type="submit">Enviar</button>
                      </form>
                    </div>
                  )}

                  {evaluationResult && (
                    <div className="evaluacion-resultado">
                      <h3>Resultados</h3>
                      <p><strong>Diagnóstico:</strong> {evaluationResult.diagnosticoOk ? "✅ Correcto" : "❌ Incorrecto"}</p>
                      <p><strong>Tratamiento:</strong></p>
                      <ul>
                        {evaluationResult.correctos.length > 0 && (
                          <li>✅ Correctos: {evaluationResult.correctos.join(", ")}</li>
                        )}
                        {evaluationResult.faltantes.length > 0 && (
                          <li>⚠️ Faltaron: {evaluationResult.faltantes.join(", ")}</li>
                        )}
                        {evaluationResult.incorrectos.length > 0 && (
                          <li>❌ Incorrectos: {evaluationResult.incorrectos.join(", ")}</li>
                        )}
                      </ul>
                      <button onClick={handleBackToSystems}>Volver a sistemas</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {section === "casos-avanzados" && (
          <div className="section card">
            <h2>Casos Avanzados</h2>
            <p>
              En construcción. Esta sección incluirá estudios visuales, audios de auscultación y más.
            </p>
          </div>
        )}

        {section === "contacto" && (
          <div className="section card">
            <h2>Contacto</h2>
            <p>Para consultas escribinos a: <b>dxproes@gmail.com</b></p>
          </div>
        )}

        {section === "colaborar" && (
          <div className="section card">
            <h2>Colaborar con DxPro</h2>
            <p>
              DxPro es un proyecto <b>100% gratuito</b>, pensado para que estudiantes de
              Medicina y Enfermería puedan practicar y mejorar sus habilidades clínicas.
              Si te gusta la plataforma y querés apoyarnos, podés colaborar con lo que 
              vos quieras a través de Cafecito ☕. 
            </p>
            <p>
              Tu aporte ayuda a mantener los servidores, seguir desarrollando nuevos
              casos clínicos y agregar más funcionalidades. ¡Cada granito de arena suma
              un montón! 🙌
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
      </main>
    </div>
  );
}

export default App;
