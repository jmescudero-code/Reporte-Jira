import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // Check if it's a batch request
    const isBatch = req.url.includes('batch=true');

    if (isBatch) {
      const { projects } = await req.json();
      if (!projects || !Array.isArray(projects)) {
        return NextResponse.json({ error: "Datos insuficientes para batch" }, { status: 400 });
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "tu_clave_de_api_aqui") {
        return NextResponse.json({ error: "Falta configurar GEMINI_API_KEY en .env.local" }, { status: 500 });
      }

      // Preparar un solo prompt con todos los proyectos
      const prompt = `Eres un asistente experto en gestión de proyectos. A continuación tienes varios proyectos (espacios de trabajo) y sus diferentes temas (Épicas) junto con las tareas trabajadas en el último período.

Proyectos:
${projects.map((p: any) => `
PROYECTO_KEY: ${p.projectKey}
Nombre: ${p.projectName}
Temas y Tareas:
${p.fronts.map((f: any) => `Tema: ${f.epicTitle}
Tareas:
${f.issues.map((t: any) => `- ${t.title} (${t.status})`).join("\n")}`).join("\n")}
`).join("\n---\n")}

Tu objetivo es redactar un resumen ejecutivo y fluido del progreso de CADA proyecto de forma individual.
Reglas importantes:
1. Para cada proyecto, redacta un párrafo de máximo 5 líneas resumiendo el avance de sus temas. Nombra explícitamente los temas.
2. Formato de salida estricto. Debes devolver UNICAMENTE un objeto JSON donde cada clave es el PROYECTO_KEY y el valor es el texto del resumen. No devuelvas bloques de código markdown ni ningún otro texto.
Ejemplo:
{"PROYECTO_1": "Resumen 1...", "PROYECTO_2": "Resumen 2..."}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json({ error: "Error en la API de IA" }, { status: 500 });
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      
      try {
        const cleanedText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();
        const summaries = JSON.parse(cleanedText);
        return NextResponse.json({ summaries });
      } catch (e) {
        return NextResponse.json({ error: "Error parseando respuesta de IA" }, { status: 500 });
      }
    }

    const { projectName, fronts } = await req.json();

    if (!projectName || !fronts || !Array.isArray(fronts)) {
      return NextResponse.json({ error: "Datos insuficientes" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === "tu_clave_de_api_aqui") {
      return NextResponse.json({ 
        error: "Falta configurar GEMINI_API_KEY en .env.local" 
      }, { status: 500 });
    }

    const prompt = `Eres un asistente experto en gestión de proyectos. A continuación tienes el nombre de un espacio de trabajo (Proyecto) y sus diferentes temas (Épicas) junto con las tareas trabajadas en el último período.

Proyecto: ${projectName}

Temas y Tareas:
${fronts.map((f: any) => `
Tema: ${f.epicTitle}
Tareas:
${f.issues.map((t: any) => `- ${t.title} (${t.status})`).join("\n")}
`).join("\n")}

Tu objetivo es redactar un resumen ejecutivo y fluido del progreso de este proyecto.
Reglas importantes:
1. Si el proyecto tiene diferentes temas (Épicas), debes nombrar explícitamente cada tema por su nombre y resumir brevemente lo avanzado en cada uno.
2. Utiliza un tono profesional, claro y orientado a directores.
3. Evita tecnicismos innecesarios.
4. Redacta en párrafos fluidos. No uses listas con viñetas ni guiones.
5. Limítate a un máximo de 5-6 líneas en total.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      return NextResponse.json({ error: "Error en la API de IA" }, { status: 500 });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar un resumen.";

    return NextResponse.json({ summary: generatedText.trim() });
  } catch (error) {
    console.error("AI Route error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
