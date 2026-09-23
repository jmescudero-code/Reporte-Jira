"use client";

import { LOGO_BASE64 } from "@/utils/logo";

import React, { forwardRef } from "react";
import { ReportData } from "@/types/jira";
import { Clock, CheckCircle2, LayoutGrid, CheckSquare } from "lucide-react";

type ReportViewProps = {
  data: ReportData | null;
};

export const ReportView = forwardRef<HTMLDivElement, ReportViewProps>(
  ({ data }, ref) => {
    if (!data) {
      return (
        <div className="flex h-full items-center justify-center text-[var(--muted)]">
          Selecciona un período y presiona "Actualizar desde Jira" para generar
          el informe.
        </div>
      );
    }

    if (data.totalClosures === 0) {
      return (
        <div className="flex h-full items-center justify-center text-[var(--muted)]">
          No se detectaron elementos finalizados en Jira para el período
          seleccionado.
        </div>
      );
    }

    return (
      <div ref={ref} className="page bg-[var(--bg)] font-sans text-[var(--text)]">
        {/* Topbar */}
        <div className="flex h-[70px] items-center justify-between bg-white px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <img
              src={`data:image/png;base64,${LOGO_BASE64}`}
              alt="GrupaMar Logo"
              className="h-11 w-auto object-contain"
            />
          </div>
          <div className="rounded-full bg-[var(--soft)] border border-[var(--line)] px-4 py-1.5 text-sm font-medium text-[var(--blue)]">
            {data.periodLabel}
          </div>
        </div>

        <div className="content flex flex-col p-4 gap-4 overflow-hidden">
          {/* Header */}
          <div className="flex shrink-0 gap-4">
            <div className="flex flex-1 flex-col justify-center rounded-xl bg-gradient-to-r from-[var(--blue)] to-[var(--cyan)] p-4 text-white shadow-sm">
              <h1 className="text-xl font-bold">
                Avance de la semana
              </h1>
              <p className="mt-0.5 text-white/80 text-xs">
                {data.startDate} — {data.endDate}
              </p>
            </div>

            <div className="flex gap-3">
              <KpiCard
                title="Elementos finalizados"
                value={data.totalClosures}
                icon={<CheckCircle2 size={20} className="text-[var(--ok)]" />}
              />
              <KpiCard
                title="Espacios con cierres"
                value={data.projectsWithClosures}
                icon={<LayoutGrid size={20} className="text-[var(--blue)]" />}
              />
              <KpiCard
                title="Frentes con avance"
                value={data.frontsWithProgress}
                icon={<CheckSquare size={20} className="text-[var(--cyan)]" />}
              />
              <KpiCard
                title="Fuera de fecha"
                value={data.lateClosures}
                icon={<Clock size={20} className="text-[var(--orange)]" />}
              />
            </div>
          </div>

          {/* Grid de Proyectos */}
          <div className="grid-projects flex-1">
            {data.projects.map((project) => (
              <div
                key={project.projectKey}
                className="project-card rounded-xl bg-white border border-[var(--line)] shadow-sm"
              >
                {/* Project Header */}
                <div className="flex items-center gap-2.5 border-b border-[var(--line)] bg-[var(--soft)] px-4 py-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--blue)] text-xs font-bold text-white shrink-0">
                    {project.totalClosures}
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold truncate">
                      {project.projectName}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {project.projectKey}
                    </span>
                  </div>
                </div>

                {/* Project Fronts */}
                <div className="fronts p-3 flex flex-col gap-3">
                  {project.fronts.map((front) => (
                    <div key={front.epicKey} className="flex flex-col gap-1.5">
                      <div className="text-xs font-bold text-[var(--blue)]">
                        {front.epicTitle}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {front.issues.map((issue) => (
                          <div
                            key={issue.key}
                            className={`flex flex-col gap-0.5 rounded border border-[var(--line)] bg-[var(--soft)] p-2 text-xs shadow-2xs border-l-3 ${
                              issue.isLate
                                ? "border-l-[var(--orange)]"
                                : "border-l-[var(--cyan)]"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="font-semibold text-xs break-words leading-tight">
                                {issue.key} · {issue.title}
                              </div>
                              <div className="text-[10px] font-medium text-[var(--muted)] whitespace-nowrap pt-0.5">
                                {issue.shortResolvedDate}
                              </div>
                            </div>
                            {issue.parentContext && (
                              <div className="text-[10px] text-[var(--muted)] mt-0.5 flex gap-1 items-center leading-tight">
                                <span className="bg-[var(--line)] w-1 h-1 rounded-full shrink-0"></span>
                                {issue.parentContext}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ReportView.displayName = "ReportView";

const KpiCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) => (
  <div className="flex min-w-[120px] flex-col items-center justify-center rounded-xl bg-white border border-[var(--line)] p-2.5 px-3 shadow-sm">
    <div className="mb-1">{icon}</div>
    <div className="text-xl font-bold text-[var(--text)]">{value}</div>
    <div className="text-[11px] font-medium text-[var(--muted)] text-center mt-0.5">
      {title}
    </div>
  </div>
);



