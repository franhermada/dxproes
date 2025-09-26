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

  // Estado de carga para el cartel de espera
  const [loadingCase, setLoadingCase] = useState(false);

  // Estados para evaluación
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [diagnosticoInput, setDiagnosticoInput] = useState("");
  const [tratamientoInput, setTratamientoInput] = useState("");
  const [evaluationResult, setEvaluationResult] = useState(null);

  // >>> NUEVO: estado de la fase del caso
  const [fase, setFase] = useState("anamnesis");
  // fases: anamnesis → examen → presuntivos → complementarios → finalizar caso

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
          setLoadingCase(true); // <-- comienza la carga
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
          setFase("anamnesis"); // <<< arrancar siempre en anamnesis
        } catch {
          setMessages([
            { texto: "⚠️ Error al cargar el caso clínico", autor: "bot" }
          ]);
        } finally {
          setLoadingCase(false); // <-- termina la carga
        }
      };
      obtenerCaso();
    } else {
      setMessages([]);
      setCaseId(null);
      setCaseData(null);
      setShowEvaluation(false);
      setEvaluationResult(null);
      setLoadingCase(false);
      setFase("anamnesis"); // <<< resetear fase
    }
  }, [section, selectedSystem]);

  // >>> NUEVO: función para evaluar diagnósticos diferenciales
  const evaluarDiferenciales = (entrada) => {
    if (!caseData || !caseData.evaluacion) return;

    const diferencialesEsperados = caseData.evaluacion.diagnostico_presuntivo.map(dx => dx.toLowerCase());
    const respuestasUsuario = entrada.toLowerCase().split(",");

    let aciertos = 0;
    respuestasUsuario.forEach(resp => {
      if (diferencialesEsperados.some(dx => resp.trim().includes(dx))) {
        aciertos++;
      }
    });

    if (aciertos >= Math.ceil(diferencialesEsperados.length * 0.6)) {
      setMessages((prev) => [
        ...prev,
        { texto: "Excelente, avancemos. ¿Qué estudios pedirías para confirmar o descartar cada diagnóstico diferencial que planteaste?", autor: "sistema" }
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { texto: "Has planteado algunos diagnósticos, pero quizás convendría pensar en otras posibilidades clínicas también.", autor: "sistema" }
      ]);
    }
  };

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { texto: input, autor: "usuario" }]);
    const pregunta = input;
    setInput("");

    // >>> NUEVO: chequeo de fase presuntivos
    if (fase === "presuntivos") {
      evaluarDiferenciales(pregunta);
      return;
    }

    // >>> NUEVO: chequeo de estudios complementarios
    if (fase === "complementarios" && caseData?.respuestas?.estudios) {
      const estudioSolicitado = Object.keys(caseData.respuestas.estudios).find(e =>
        pregunta.toLowerCase().includes(e.toLowerCase())
      );

      if (estudioSolicitado) {
        setMessages((prev) => [
          ...prev,
          { texto: caseData.respuestas.estudios[estudioSolicitado], autor: "bot" }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { texto: "Parámetros dentro de lo normal.", autor: "sistema" }
        ]);
      }
      return;
    }

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
    setLoadingCase(false);
    setFase("anamnesis");
  };

  // >>> NUEVO: función para avanzar de fase con separador + mensaje opcional
  const avanzarFase = (nuevaFase, textoSeparador, mensajeExtra = null) => {
    setFase(nuevaFase);
    let nuevosMensajes = [
      { texto: `--- ${textoSeparador} ---`, autor: "sistema" }
    ];
    if (mensajeExtra) {
      nuevosMensajes.push({ texto: mensajeExtra, autor: "sistema" });
    }
    setMessages((prev) => [...prev, ...nuevosMensajes]);
  };

  // Evaluar respuestas
  const handleEvaluation = (e) => {
    e.preventDefault(); // <<< FIX: evitar refresco
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
            <img src="/facultad sin fondo.png" alt="Facultad Logo" className="inicio-logo facultad" />
          </div>
        </div>
      )}

      {section === "tutorial" && (
        <div className="section card">
          <h2>Tutorial</h2>
          <ol className="tutorial-list">
            <li>
              Se le presentará un paciente con un motivo de consulta inicial. 
              El primer paso será realizar una anamnesis completa, formulando preguntas que considere relevantes. 
              Cuando crea que la anamnesis está finalizada, deberá pulsar el botón <b>"Avanzar a Examen Físico"</b>.
            </li>
            <li>
              En la fase de examen físico, podrá indicar qué maniobras desea realizar 
              (ejemplo: auscultación cardíaca, palpación abdominal). 
              Una vez completada, deberá pulsar el botón <b>"Avanzar a Diagnósticos Diferenciales"</b>.
            </li>
            <li>
              En la etapa de diagnósticos diferenciales, deberá proponer las posibles causas del cuadro clínico en base a la información recogida. 
              Al avanzar, el sistema le devolverá un mensaje motivador invitándolo a pensar qué estudios solicitaría para confirmar o descartar cada uno. 
              Luego deberá pulsar <b>"Avanzar a Estudios Complementarios"</b>.
            </li>
            <li>
              En la fase de estudios complementarios, podrá solicitar los estudios que correspondan a cada diagnóstico diferencial. 
              En los casos básicos, el sistema mostrará directamente el resultado textual de cada estudio. 
              En los casos avanzados, el sistema devolverá únicamente el material (imagen, audio, etc.) y será el usuario quien deba interpretarlo. 
              Cuando finalice, deberá pulsar <b>"Finalizar caso"</b>.
            </li>
            <li>
              Finalmente, en la etapa de evaluación, podrá ingresar su diagnóstico principal y el tratamiento inicial que considere adecuado, 
              tras lo cual recibirá una retroalimentación formativa.
            </li>
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
          ) : loadingCase ? (
            // <-- CARTEL DE ESPERA (se muestra mientras carga el caso)
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

                {/* >>> NUEVO BLOQUE DE FLUJO ESTRUCTURADO */}
                {caseData && !showEvaluation && !evaluationResult && (
                  <div className="fase-buttons">
                    {fase === "anamnesis" && (
                      <button onClick={() => avanzarFase("examen", "Inicio del Examen Físico")}>
                        Avanzar a Examen Físico
                      </button>
                    )}
                    {fase === "examen" && (
                      <button onClick={() => avanzarFase(
                        "presuntivos",
                        "Diagnósticos Diferenciales",
                        "En base a la información obtenida, ¿cuáles serían tus diagnósticos diferenciales?"
                        )}>
                        Avanzar a Diagnósticos Diferenciales
                      </button>
                    )}
                    {fase === "presuntivos" && (
                      <button onClick={() => avanzarFase(
                        "complementarios",
                        "Estudios Complementarios"
                      )}>
                        Avanzar a Estudios Complementarios
                      </button>
                    )}
                    {fase === "complementarios" && (
                      <button 
                        className="finalizar-btn" 
                        onClick={() => setShowEvaluation(true)}
                      >
                        Finalizar Caso
                      </button>
                    )}
                  </div>
                )}
                {/* <<< FIN NUEVO BLOQUE */}

                {showEvaluation && !evaluationResult && (
                  <div className="evaluacion-form">
                    <h3>Evaluación del Caso</h3>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault(); // evita refrescar la página
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
    <p>
      Casos de mayor complejidad que requieren un razonamiento clínico más profundo. 
      Aquí el usuario deberá interpretar directamente los estudios complementarios 
      (imágenes, audios de auscultación, registros) y tomar decisiones sin que el sistema 
      brinde explicaciones automáticas. Esta sección busca simular la práctica clínica real.
    </p>

    <div 
      style={{
        marginTop: "20px",
        padding: "12px 16px",
        backgroundColor: "#fff3cd",
        border: "1px solid #ffeeba",
        borderRadius: "8px",
        color: "#856404",
        fontWeight: "bold",
        textAlign: "center"
      }}
    >
      ⚠️ Sección en desarrollo. Pronto habrá más novedades.
    </div>
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
          <p>
            DxPro es un proyecto <b>100% gratuito</b>, pensado para que estudiantes de
            Medicina y Enfermería puedan practicar y mejorar sus habilidades clínicas.
            Si te gusta la plataforma y querés apoyarnos, podés colaborar con lo que 
            vos quieras a través de Cafecito. 
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
    </div>
  );
}
