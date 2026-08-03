"use client";

import { LOGO_BASE64 } from "@/utils/logo";
import React, { forwardRef, useState } from "react";
import { ReportData, ReportFront, ReportProject } from "@/types/jira";
import { parseISO, getISOWeek, eachWeekOfInterval, endOfWeek, isBefore, isAfter, startOfDay } from "date-fns";
import { CheckCircle2, Circle, LayoutGrid, LayoutList, Bot, Loader2, Sparkles, RotateCcw } from "lucide-react";

type ExecutiveViewProps = {
  data: ReportData | null;
};

export const ExecutiveView = forwardRef<HTMLDivElement, ExecutiveViewProps>(
  ({ data }, ref) => {
    const [activeTab, setActiveTab] = useState<"gantt" | "summary">("gantt");
    const [summaries, setSummaries] = useState<Record<string, { text: string; loading: boolean; error?: string }>>({});
    const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

    if (!data) {
      return (
        <div className="flex h-full items-center justify-center text-[var(--muted)]">
          Selecciona un período y presiona "Actualizar desde Jira".
        </div>
      );
    }

    if (data.projects.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-[var(--muted)]">
          No se encontraron épicas en el período seleccionado.
        </div>
      );
    }

    const pStart = parseISO(data.startDate.split("/").reverse().join("-"));
    const pEnd = parseISO(data.endDate.split("/").reverse().join("-"));
    const weekStarts = eachWeekOfInterval({ start: pStart, end: pEnd }, { weekStartsOn: 1 });
    const weekNumbers = weekStarts.map(w => getISOWeek(w));

    const getEpicActivityWeeks = (front: ReportFront): Set<number> => {
      const activeWeeks = new Set<number>();
      front.issues.forEach(issue => {
        const created = parseISO(issue.createdDate);
        const end = issue.resolvedDate ? parseISO(issue.resolvedDate) : parseISO(issue.updatedDate);
        weekStarts.forEach((ws, i) => {
          const we = endOfWeek(ws, { weekStartsOn: 1 });
          if (!isAfter(startOfDay(created), we) && !isBefore(startOfDay(end), ws)) {
            activeWeeks.add(weekNumbers[i]);
          }
        });
      });
      return activeWeeks;
    };

    const toggleFlip = (key: string) => {
      setFlippedCards(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    const handleGenerateProjectSummary = async (proj: ReportProject, e: React.MouseEvent) => {
      e.stopPropagation(); // Don't flip the card
      setSummaries(prev => ({
        ...prev,
        [proj.projectKey]: { text: "", loading: true }
      }));
      try {
        const res = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: proj.projectName,
            fronts: proj.fronts.map(f => ({
              epicTitle: f.epicTitle,
              issues: f.issues
            }))
          })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Error al generar resumen");
        setSummaries(prev => ({
          ...prev,
          [proj.projectKey]: { text: result.summary, loading: false }
        }));
      } catch (err: any) {
        setSummaries(prev => ({
          ...prev,
          [proj.projectKey]: { text: "", loading: false, error: err.message }
        }));
      }
    };

    const handleGenerateAll = async () => {
      const projectsToGenerate = data.projects.filter(p => p.fronts.length > 0 && !summaries[p.projectKey]?.text);
      if (projectsToGenerate.length === 0) return;

      // Set all to loading
      setSummaries(prev => {
        const next = { ...prev };
        projectsToGenerate.forEach(p => {
          next[p.projectKey] = { text: "", loading: true };
        });
        return next;
      });

      try {
        const res = await fetch("/api/ai-summary?batch=true", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projects: projectsToGenerate.map(p => ({
              projectKey: p.projectKey,
              projectName: p.projectName,
              fronts: p.fronts.map(f => ({
                epicTitle: f.epicTitle,
                issues: f.issues
              }))
            }))
          })
        });

        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || "Error al generar resúmenes en lote");
        }

        setSummaries(prev => {
          const next = { ...prev };
          projectsToGenerate.forEach(p => {
            if (result.summaries && result.summaries[p.projectKey]) {
              next[p.projectKey] = { text: result.summaries[p.projectKey], loading: false };
            } else {
              next[p.projectKey] = { text: "", loading: false, error: "No se generó resumen" };
            }
          });
          return next;
        });

      } catch (err: any) {
        setSummaries(prev => {
          const next = { ...prev };
          projectsToGenerate.forEach(p => {
            next[p.projectKey] = { text: "", loading: false, error: err.message };
          });
          return next;
        });
      }
    };

    // ── GANTT TAB ──
    const renderGantt = () => (
      <div className="flex flex-col gap-6">
        {data.projects.map(proj => {
          if (proj.fronts.length === 0) return null;
          return (
            <div key={proj.projectKey} className="bg-white rounded-xl border border-[var(--line)] p-5 shadow-sm overflow-x-auto">
              <h3 className="text-lg font-bold text-[var(--text)] mb-4">{proj.projectName}</h3>
              <div className="min-w-[600px] flex flex-col gap-3">
                <div className="flex items-center gap-4 border-b border-[var(--line)] pb-2 mb-2">
                  <div className="w-[45%] flex-shrink-0 text-sm font-bold text-[var(--text)] px-2">Tema / Épica</div>
                  <div className="flex-1 flex gap-2">
                    {weekNumbers.map((wn, i) => (
                      <div key={i} className="flex-1 text-center text-xs font-bold text-[var(--muted)]">S{wn}</div>
                    ))}
                  </div>
                </div>
                {proj.fronts.map(front => {
                  const activeWeeks = getEpicActivityWeeks(front);
                  return (
                    <div key={front.epicKey} className="flex items-center gap-4">
                      <div className="w-[45%] flex-shrink-0 text-sm font-medium text-[var(--blue)] px-2" title={front.epicTitle}>{front.epicTitle}</div>
                      <div className="flex-1 flex gap-2 h-9">
                        {weekNumbers.map((wn, i) => {
                          const isActive = activeWeeks.has(wn);
                          return (
                            <div key={i} className={`flex-1 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all ${isActive ? "bg-gradient-to-br from-[var(--cyan)] to-[var(--blue)] border-transparent text-white shadow-sm" : "bg-[var(--soft)] border-[var(--line)] text-[var(--line)]"}`} title={isActive ? `Actividad en semana ${wn}` : `Sin actividad semana ${wn}`}>{isActive ? wn : ""}</div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );

    // ── SUMMARY TAB (flip cards) ──
    const activeProjects = data.projects.filter(p => p.fronts.length > 0);
    const allGenerated = activeProjects.every(p => summaries[p.projectKey]?.text);

    const renderSummary = () => {
      // Calculate grid dimensions to fill screen
      const count = activeProjects.length;
      let cols = 3;
      if (count <= 2) cols = 2;
      else if (count <= 4) cols = 2;
      else if (count <= 6) cols = 3;
      else cols = 4;
      const rows = Math.ceil(count / cols);

      return (
        <div className="flex flex-col gap-4 h-full">
          {/* Generate All button */}
          {!allGenerated && (
            <div className="flex justify-end shrink-0">
              <button
                onClick={handleGenerateAll}
                className="flex items-center gap-2 bg-[var(--blue)] hover:bg-[#070d75] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
              >
                <Bot size={16} />
                Generar todos los resúmenes IA
              </button>
            </div>
          )}

          {/* Flip Cards Grid */}
          <div
            className="flex-1 grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {activeProjects.map(proj => {
              const sumState = summaries[proj.projectKey];
              const isFlipped = flippedCards.has(proj.projectKey);
              const totalTasks = proj.fronts.reduce((acc, f) => acc + f.issues.length, 0);
              const closedTasks = proj.fronts.reduce((acc, f) => acc + f.issues.filter(i => i.status === "Done").length, 0);

              return (
                <div
                  key={proj.projectKey}
                  className="flip-card-container cursor-pointer"
                  onClick={() => toggleFlip(proj.projectKey)}
                  title="Haz clic para ver el detalle"
                >
                  <div className={`flip-card-inner ${isFlipped ? "flipped" : ""}`}>
                    {/* ── FRONT ── */}
                    <div className="flip-card-face flip-card-front rounded-xl bg-white border border-[var(--line)] shadow-sm flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between bg-gradient-to-r from-[var(--blue)] to-[var(--cyan)] px-5 py-3 rounded-t-xl">
                        <h3 className="text-base font-bold text-white truncate">{proj.projectName}</h3>
                        <span className="text-[10px] text-white/80 font-medium bg-white/20 rounded-full px-2.5 py-0.5 whitespace-nowrap">
                          {closedTasks}✓ · {totalTasks - closedTasks}⟳
                        </span>
                      </div>

                      {/* Body */}
                      <div className="flex-1 flex flex-col justify-center p-5">
                        {sumState?.loading ? (
                          <div className="flex flex-col items-center gap-3 text-[var(--muted)] text-sm">
                            <Loader2 size={24} className="animate-spin text-[var(--blue)]" />
                            <span>Gemini está redactando...</span>
                          </div>
                        ) : sumState?.text ? (
                          <div className="flex gap-3">
                            <Sparkles size={18} className="text-[var(--cyan)] shrink-0 mt-1" />
                            <p className="text-sm text-[var(--text)] leading-relaxed line-clamp-5">{sumState.text}</p>
                          </div>
                        ) : sumState?.error ? (
                          <div className="flex flex-col items-center gap-2 text-center">
                            <span className="text-xs text-[var(--orange)]">{sumState.error}</span>
                            <button
                              onClick={(e) => handleGenerateProjectSummary(proj, e)}
                              className="text-xs text-[var(--blue)] underline"
                            >
                              Reintentar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3">
                            <p className="text-xs text-[var(--muted)] italic text-center">
                              {proj.fronts.length} tema{proj.fronts.length !== 1 ? "s" : ""} · {totalTasks} tarea{totalTasks !== 1 ? "s" : ""} trabajadas
                            </p>
                            <button
                              onClick={(e) => handleGenerateProjectSummary(proj, e)}
                              className="flex items-center gap-2 bg-[var(--blue)] hover:bg-[#070d75] text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
                            >
                              <Bot size={14} />
                              Generar Resumen
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Footer hint */}
                      <div className="px-5 py-2 border-t border-[var(--line)] text-[10px] text-[var(--muted)] text-center flex items-center justify-center gap-1">
                        <RotateCcw size={10} />
                        Toca para ver detalle
                      </div>
                    </div>

                    {/* ── BACK ── */}
                    <div className="flip-card-face flip-card-back rounded-xl bg-white border border-[var(--line)] shadow-sm flex flex-col">
                      {/* Header */}
                      <div className="flex items-center justify-between bg-[var(--soft)] px-5 py-3 rounded-t-xl border-b border-[var(--line)]">
                        <h3 className="text-sm font-bold text-[var(--blue)] truncate">{proj.projectName}</h3>
                        <span className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                          <RotateCcw size={10} />
                          Volver
                        </span>
                      </div>

                      {/* Scrollable details */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {proj.fronts.map(front => {
                          const done = front.issues.filter(i => i.status === "Done");
                          const inProgress = front.issues.filter(i => i.status !== "Done");

                          return (
                            <div key={front.epicKey} className="flex flex-col gap-1.5">
                              <div className="text-xs font-bold text-[var(--blue)]">{front.epicTitle}</div>
                              {done.map(issue => (
                                <div key={issue.key} className="flex items-start gap-1.5 text-[11px] text-[var(--text)]">
                                  <CheckCircle2 size={12} className="text-[var(--ok)] shrink-0 mt-0.5" />
                                  <span>{issue.title}</span>
                                </div>
                              ))}
                              {inProgress.map(issue => (
                                <div key={issue.key} className="flex items-start gap-1.5 text-[11px] text-[var(--muted)]">
                                  <Circle size={12} className="text-[var(--cyan)] shrink-0 mt-0.5" />
                                  <span>{issue.title}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div ref={ref} className="page bg-[var(--bg)] font-sans text-[var(--text)] h-full flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex h-[70px] items-center justify-between bg-white px-6 shadow-sm shrink-0 z-50">
          <div className="flex items-center gap-4">
            <img src={`data:image/png;base64,${LOGO_BASE64}`} alt="GrupaMar Logo" className="h-11 w-auto object-contain" />
            <div className="h-6 w-px bg-[var(--line)]"></div>
            <h1 className="text-lg font-bold text-[var(--blue)]">Visión Ejecutiva</h1>
          </div>
          <div className="rounded-full bg-[var(--soft)] border border-[var(--line)] px-4 py-1.5 text-sm font-medium text-[var(--blue)]">
            {data.periodLabel}
          </div>
        </div>

        <div className="flex-1 flex flex-col p-6 gap-4 min-h-0 overflow-hidden">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-white border border-[var(--line)] rounded-lg w-max shadow-sm shrink-0">
            <button
              onClick={() => setActiveTab("gantt")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === "gantt"
                ? "bg-[var(--blue)] text-white shadow-md"
                : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]"
              }`}
            >
              <LayoutList size={16} />
              Bloques Semanales
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
                activeTab === "summary"
                ? "bg-[var(--blue)] text-white shadow-md"
                : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]"
              }`}
            >
              <LayoutGrid size={16} />
              Resumen de Avances
            </button>
          </div>

          {/* Content */}
          <div className={`flex-1 min-h-0 ${activeTab === "gantt" ? "overflow-y-auto" : "overflow-hidden"}`}>
            {activeTab === "gantt" ? renderGantt() : renderSummary()}
          </div>
        </div>
      </div>
    );
  }
);

ExecutiveView.displayName = "ExecutiveView";
