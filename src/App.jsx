import { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

const SYSTEMS = [
  { id: "todos", label: "Todos" },
  { id: "cardiovascular", label: "Cardiovascular" },
  { id: "respiratorio", label: "Respiratorio" },
  { id: "renal", label: "Renal" },
  { id: "digestivo", label: "Digestivo" },
  { id: "endocrino", label: "Endocrino" }
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  const [section, setSection] = useState("inicio");
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [caseData, setCaseData] = useState(null);

  // Estados para evaluación
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [diagnosticoInput, setDiagnosticoInput] = useState("");
  const [tratamientoInput, setTratamientoInput] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);

  const BACKEND_URL = "https://dxproes-backend.onrender.com";

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cargar un caso al azar cuando se elige un sistema
  useEffect(() => {
    if (section === "casos-basicos" && selectedSystem) {
      const obtenerCaso = async () => {
        try {
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

    setMessages((prev) => [...prev, { texto: input, autor: "usuario" }]);
    const pregunta = input;
    setInput("");

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/preguntar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta, caseId }),
      });
      const data = await respuesta.json();

      if (Array.isArray(data.respuestas)) {
        setMessages((prev) => [
          ...prev,
          ...data.respuestas.map((r) => ({ texto: r, autor: "bot" })),
        ]);
      } else if (data.respuesta) {
        setMessages((prev) => [...prev, { texto: data.respuesta, autor: "bot" }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { texto: "⚠️ Respuesta no válida", autor: "bot" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { texto: "⚠️ Error al conectar con el servidor", autor: "bot" },
      ]);
    }
  };

  // Volver a la selección de sistemas
  const handleBackToSystems = () => {
    setSelectedSystem(null);
    setMessages([]);
    setCaseId(null);
    setCaseData(null);
    setShowEvaluation(false);
    setEvaluationResult(null);
  };

  // Evaluar respuestas
  const handleEvaluation = () => {
    if (!caseData || !caseData.evaluacion) return;

    const diagnosticosCorrectos = caseData.evaluacion.diagnostico_presuntivo.map(d => d.toLowerCase());
    const tratamientosCorrectos = caseData.evaluacion.tratamiento_inicial_esperado.map(t => t.toLowerCase());

    const diagnosticoUser = diagnosticoInput.trim().toLowerCase();
    const tratamientosUser = tratamientoInput.split(",").map(t => t.trim().toLowerCase());

    const diagnosticoOk = diagnosticosCorrectos.includes(diagnosticoUser);

    const correctos = tratamientosUser.filter(t => tratamientosCorrectos.includes(t));
    const faltantes = tratamientosCorrectos.filter(t => !tratamientosUser.includes(t));
    const incorrectos = tratamientosUser.filter(t => !tratamientosCorrectos.includes(t));

    setEvaluationResult({
      diagnosticoOk,
      correctos,
      faltantes,
      incorrectos,
    });
  };

  return (
    <div className="app-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-left">
          <img src="/DxPro.png" alt="DxPro Logo" className="nav-logo" />
        </div>
        <div className="navbar-center">
          <button className="nav-btn" onClick={() => setSection("inicio")}>
            Inicio
          </button>
          <button className="nav-btn" onClick={() => setSection("tutorial")}>
            Tutorial
          </button>
          <button className="nav-btn" onClick={() => setSection("casos-basicos")}>
            Casos Básicos
          </button>
          <button className="nav-btn" onClick={() => setSection("casos-avanzados")}>
            Casos Avanzados
          </button>
          <button className="nav-btn" onClick={() => setSection("contacto")}>
            Contacto
          </button>
          <button className="nav-btn" onClick={() => setSection("colaborar")}>
            Colaborar
          </button>
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
            Un simulador virtual de casos clínicos donde podrás desarrollar tus
            habilidades clinicas. DxPro surge como parte de un proyecto de
            investigación sobre el uso de herramientas digitales (como IA) en el
            desarrollo académico de estudiantes de Medicina y Enfermería, en la
            Facultad de Ciencias de la Salud perteneciente a la Universidad Nacional
            del Centro de la Provincia de Buenos Aires.
          </p>
          <div className="inicio-logo-container">
            <img src="/DxPro.png" alt="DxPro Logo" className="inicio-logo" />
            <img src="/facultad.png" alt="Facultad Logo" className="inicio-logo facultad" />
          </div>
        </div>
      )}

      {section === "tutorial" && (
        <div className="section card">
          <h2>Tutorial</h2>
          <ol className="tutorial-list">
            <li>Se le presentará un paciente, deberá realizar una completa anamnesis basada en el motivo de consulta.</li>
            <li>Una vez considere que la anamnesis está finalizada, deberá pasar al examen físico, describiendo que maniobra realiza (ej: auscultacion cardiaca)</li>
            <li>Cuando el examen físico esté finalizado, continuará con los exámenes complementarios, mediante la misma lógica que en el examen fisico, describiendo que estudio solicita. En los casos básicos, el sistema informará directamente el resultado del estudio; en los casos avanzados, el sistema devolverá el estudio y el usuario deberá interpretarlo.</li>
            <li>Finalmente, en base a la anamnesis, el examen físico y los estudios complementarios, el usuario deberá pulsar en "Finalizar caso", donde se abrirá una pestaña donde deberá dar un diagnostico presuntivo y un tratamiento.</li>
          </ol>
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

                {/* Botón Finalizar Caso */}
                {caseData && !showEvaluation && !evaluationResult && (
                  <button 
                    className="finalizar-btn" 
                    onClick={() => setShowEvaluation(true)}
                  >
                    Finalizar Caso
                  </button>
                )}

                {/* Formulario Evaluación */}
                {showEvaluation && !evaluationResult && (
                  <div className="evaluacion-form">
                    <h3>Evaluación del Caso</h3>
                    <label>Diagnóstico Presuntivo:</label>
                    <input 
                      type="text" 
                      value={diagnosticoInput} 
                      onChange={(e) => setDiagnosticoInput(e.target.value)} 
                      placeholder="Ej: Infarto agudo de miocardio"
                    />
                    <label>Tratamiento Inicial:</label>
                    <textarea
                      rows="3"
                      value={tratamientoInput}
                      onChange={(e) => setTratamientoInput(e.target.value)}
                      placeholder="Ej: Aspirina, oxígeno, monitoreo..."
                    />
                    <button onClick={handleEvaluation}>Enviar</button>
                  </div>
                )}

                {/* Resultados Evaluación */}
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
          <p>Casos de mayor complejidad, donde el usuario deberá hacer la interpretación de los estudios complementarios...</p>
        </div>
      )}

      {section === "contacto" && (
        <div className="section card">
          <h2>Contacto</h2>
          <p>Ante dudas o consultas, escribinos a <b>dxproes@gmail.com</b></p>
        </div>
      )}

      {section === "colaborar" && (
        <div className="section card">
          <h2>Colaborar con DxPro</h2>
          <p>DxPro es un proyecto <b>100% gratuito</b>... </p>
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