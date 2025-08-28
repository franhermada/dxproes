
export async function enviarPregunta(pregunta) {
  const response = await fetch("http://localhost:5000/api/caso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pregunta }),
  });
  return await response.json();
}
