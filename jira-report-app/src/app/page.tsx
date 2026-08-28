"use client";

import { LOGO_BASE64 } from "@/utils/logo";

import { useState, useRef, useEffect } from "react";
import { FilterPanel, FilterState } from "@/components/FilterPanel";
import { ReportView } from "@/components/ReportView";
import { ExecutiveView } from "@/components/ExecutiveView";
import { ReportData } from "@/types/jira";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("grupamar_auth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.toLowerCase() === "grigru") {
      sessionStorage.setItem("grupamar_auth", "true");
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };
  const [data, setData] = useState<ReportData | null>(null);
  const [currentFilters, setCurrentFilters] = useState<FilterState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async (filters: FilterState) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/jira", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      if (!res.ok) {
        let errMsg = "Error fetching data";
        try {
          const errorData = await res.json();
          if (errorData.error) errMsg = errorData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const result: ReportData = await res.json();
      setData(result);
      setCurrentFilters(filters);
    } catch (err: any) {
      console.error(err);
      alert(`Error al consultar Jira:\n\n${err.message}\n\nRevisa la conexión, opciones o credenciales.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!reportRef.current || !data) return;
    
    // Create a copy of the HTML with embedded styles
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Informe Jira - ${data.periodLabel}</title>
        <style>
          /* Minimal embedded CSS for the exported HTML */
          :root {
            --blue: #091197;
            --cyan: #03A9EC;
            --orange: #F75600;
            --white: #FFFFFF;
            --bg: #F6F6F6;
            --text: #12233D;
            --muted: #5F6F82;
            --line: #DBE4EE;
            --ok: #0C8B4D;
            --ok-bg: #E9F7EF;
            --soft: #F8FBFF;
          }
          * { box-sizing: border-box; }
          body, html {
            margin: 0; padding: 0;
            font-family: Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            min-height: 100vh;
            overflow-y: auto;
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: #DBE4EE;
            border-radius: 3px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #5F6F82;
          }
        </style>
        <!-- Tailwind via CDN para simplificar en el archivo exportado -->
        <script src="https://unpkg.com/@tailwindcss/browser@4"></script>
        <style type="text/tailwindcss">
          @theme {
            --color-var-blue: var(--blue);
            --color-var-cyan: var(--cyan);
            --color-var-orange: var(--orange);
            --color-var-white: var(--white);
            --color-var-bg: var(--bg);
            --color-var-text: var(--text);
            --color-var-muted: var(--muted);
            --color-var-line: var(--line);
            --color-var-ok: var(--ok);
            --color-var-ok-bg: var(--ok-bg);
            --color-var-soft: var(--soft);
          }
          .page {
            min-height: 100vh;
            height: auto;
          }
          .content {
            overflow: visible !important;
          }
          .grid-projects {
            min-height: 0;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
          }
          .project-card {
            min-height: 200px;
            max-height: 520px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .fronts {
            flex: 1;
            min-height: 0;
            max-height: 460px;
            overflow-y: auto !important;
            overflow-x: hidden;
          }
        </style>
      </head>
      <body>
        ${reportRef.current.outerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe_jira_${data.periodLabel.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !data) return;
    
    // We send the current HTML to the backend to render it via Puppeteer
    try {
      const htmlContent = reportRef.current.outerHTML;
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: htmlContent }),
      });
      
      if (!res.ok) throw new Error("Error generando PDF");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `informe_jira_${data.periodLabel.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("No se pudo generar el PDF");
    }
  };

  if (checkingAuth) {
    return <div className="flex h-screen w-screen items-center justify-center bg-[#F6F6F6]" />;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-[#091197]/5 via-[#F6F6F6] to-[#03A9EC]/5 font-sans">
        <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur-md rounded-2xl border border-[#DBE4EE] shadow-xl flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
          <img 
            src={`data:image/png;base64,${LOGO_BASE64}`} 
            alt="GrupaMar Logo" 
            className="h-14 w-auto object-contain mb-2"
          />
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#12233D]">Control de Acceso</h2>
            <p className="text-sm text-[#5F6F82] mt-1">Introduce el PIN de 6 caracteres para ver los avances de la semana.</p>
          </div>

          <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-4">
            <div className="flex flex-col gap-2 relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (pinError) setPinError(false);
                }}
                placeholder="••••••"
                className={`w-full tracking-[0.5em] text-center font-mono text-2xl py-3 px-4 rounded-xl border bg-white focus:outline-none transition-all ${
                  pinError 
                    ? "border-[#F75600] ring-2 ring-[#F75600]/10 focus:border-[#F75600]" 
                    : "border-[#DBE4EE] focus:border-[#091197] focus:ring-2 focus:ring-[#091197]/10"
                }`}
                autoFocus
              />
              {pinError && (
                <span className="text-xs text-[#F75600] font-medium text-center mt-1 animate-bounce">
                  PIN incorrecto. Inténtalo de nuevo.
                </span>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#091197] hover:bg-[#03A9EC] text-white font-bold rounded-xl shadow-md transition-all duration-200 cursor-pointer transform active:scale-[0.98]"
            >
              Verificar PIN
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-[var(--bg)]">
      {/* Panel lateral de filtros */}
      <FilterPanel
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onDownloadHtml={handleDownloadHtml}
        onDownloadPdf={handleDownloadPdf}
        hasData={data !== null && data.totalClosures > 0}
      />

      {/* Vista principal del informe */}
      <div className="flex-1 overflow-hidden relative">
        {currentFilters?.viewMode === "ejecutivo" ? (
          <ExecutiveView data={data} ref={reportRef} />
        ) : (
          <ReportView data={data} ref={reportRef} />
        )}
      </div>
    </main>
  );
}
