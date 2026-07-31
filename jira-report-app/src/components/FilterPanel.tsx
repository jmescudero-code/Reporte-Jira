"use client";

import React, { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from "date-fns";

export type FilterState = {
  type: "week" | "month" | "custom";
  weekYear: number;
  weekNumber: number;
  monthYear: number;
  monthNumber: number;
  customStart: string;
  customEnd: string;
  projects: string[];
  showEmptySpaces: boolean;
  includeResponsible: boolean;
  includePending: boolean;
};

const DEFAULT_PROJECTS = ["DES", "HED", "KPI", "LG", "MV", "GRUPA", "SPG"];

type FilterPanelProps = {
  onGenerate: (filters: FilterState) => void;
  isGenerating: boolean;
  onDownloadHtml: () => void;
  onDownloadPdf: () => void;
  hasData: boolean;
};

export const FilterPanel = ({
  onGenerate,
  isGenerating,
  onDownloadHtml,
  onDownloadPdf,
  hasData,
}: FilterPanelProps) => {
  const currentYear = new Date().getFullYear();
  // Simplified week calculation
  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const currentWeek = getWeekNumber(new Date());
  const currentMonth = new Date().getMonth() + 1;

  const [filters, setFilters] = useState<FilterState>({
    type: "week",
    weekYear: currentYear,
    weekNumber: currentWeek,
    monthYear: currentYear,
    monthNumber: currentMonth,
    customStart: format(new Date(), "yyyy-MM-dd"),
    customEnd: format(new Date(), "yyyy-MM-dd"),
    projects: DEFAULT_PROJECTS,
    showEmptySpaces: false,
    includeResponsible: false,
    includePending: false,
  });

  const handleProjectToggle = (proj: string) => {
    setFilters((prev) => ({
      ...prev,
      projects: prev.projects.includes(proj)
        ? prev.projects.filter((p) => p !== proj)
        : [...prev.projects, proj],
    }));
  };

  const toggleAllProjects = () => {
    setFilters((prev) => ({
      ...prev,
      projects: prev.projects.length === DEFAULT_PROJECTS.length ? [] : DEFAULT_PROJECTS,
    }));
  };

  return (
    <div className="w-80 h-full bg-white border-r border-[var(--line)] flex flex-col shadow-sm z-10">
      <div className="p-4 border-b border-[var(--line)]">
        <h2 className="text-lg font-bold text-[var(--blue)]">Panel de Filtros</h2>
        <p className="text-xs text-[var(--muted)]">Configura el informe Jira</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 text-sm">
        {/* Tipo de Informe */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-[var(--text)]">Período</label>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={filters.type === "week"}
                onChange={() => setFilters({ ...filters, type: "week" })}
                className="accent-[var(--blue)]"
              />
              Semana
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={filters.type === "month"}
                onChange={() => setFilters({ ...filters, type: "month" })}
                className="accent-[var(--blue)]"
              />
              Mes
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={filters.type === "custom"}
                onChange={() => setFilters({ ...filters, type: "custom" })}
                className="accent-[var(--blue)]"
              />
              Rango personalizado
            </label>
          </div>
        </div>

        {/* Detalles del Período */}
        {filters.type === "week" && (
          <div className="flex flex-col gap-2 bg-[var(--soft)] p-3 rounded-md border border-[var(--line)]">
            <div className="flex gap-2">
              <input
                type="number"
                value={filters.weekYear}
                onChange={(e) =>
                  setFilters({ ...filters, weekYear: Number(e.target.value) })
                }
                className="w-20 border border-[var(--line)] rounded p-1 text-center"
              />
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[var(--muted)]">Sem.</span>
                <input
                  type="number"
                  min="1"
                  max="53"
                  value={filters.weekNumber}
                  onChange={(e) =>
                    setFilters({ ...filters, weekNumber: Number(e.target.value) })
                  }
                  className="w-full border border-[var(--line)] rounded p-1 text-center"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setFilters({ ...filters, weekNumber: currentWeek, weekYear: currentYear })}
                className="flex-1 text-xs bg-white border border-[var(--line)] py-1 rounded hover:bg-[var(--bg)] transition-colors"
              >
                Actual
              </button>
              <button
                onClick={() => setFilters({ ...filters, weekNumber: currentWeek > 1 ? currentWeek - 1 : 52, weekYear: currentWeek > 1 ? currentYear : currentYear - 1 })}
                className="flex-1 text-xs bg-white border border-[var(--line)] py-1 rounded hover:bg-[var(--bg)] transition-colors"
              >
                Pasada
              </button>
            </div>
          </div>
        )}

        {filters.type === "month" && (
          <div className="flex flex-col gap-2 bg-[var(--soft)] p-3 rounded-md border border-[var(--line)]">
            <input
              type="number"
              value={filters.monthYear}
              onChange={(e) =>
                setFilters({ ...filters, monthYear: Number(e.target.value) })
              }
              className="w-full border border-[var(--line)] rounded p-1 text-center"
            />
            <select
              value={filters.monthNumber}
              onChange={(e) =>
                setFilters({ ...filters, monthNumber: Number(e.target.value) })
              }
              className="w-full border border-[var(--line)] rounded p-1"
            >
              {[
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
              ].map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        {filters.type === "custom" && (
          <div className="flex flex-col gap-2 bg-[var(--soft)] p-3 rounded-md border border-[var(--line)]">
            <input
              type="date"
              value={filters.customStart}
              onChange={(e) =>
                setFilters({ ...filters, customStart: e.target.value })
              }
              className="w-full border border-[var(--line)] rounded p-1"
            />
            <input
              type="date"
              value={filters.customEnd}
              onChange={(e) =>
                setFilters({ ...filters, customEnd: e.target.value })
              }
              className="w-full border border-[var(--line)] rounded p-1"
            />
          </div>
        )}

        {/* Proyectos */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-semibold text-[var(--text)]">Proyectos</label>
            <button
              onClick={toggleAllProjects}
              className="text-xs text-[var(--blue)] hover:underline"
            >
              {filters.projects.length === DEFAULT_PROJECTS.length ? "Ninguno" : "Todos"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEFAULT_PROJECTS.map((proj) => (
              <label key={proj} className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={filters.projects.includes(proj)}
                  onChange={() => handleProjectToggle(proj)}
                  className="accent-[var(--blue)]"
                />
                {proj}
              </label>
            ))}
          </div>
        </div>

        {/* Opciones adicionales */}
        <div className="flex flex-col gap-2">
          <label className="font-semibold text-[var(--text)]">Opciones</label>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={filters.showEmptySpaces}
              onChange={(e) => setFilters({ ...filters, showEmptySpaces: e.target.checked })}
              className="accent-[var(--blue)]"
            />
            Mostrar espacios sin actividad
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={filters.includeResponsible}
              onChange={(e) => setFilters({ ...filters, includeResponsible: e.target.checked })}
              className="accent-[var(--blue)]"
            />
            Incluir responsables
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={filters.includePending}
              onChange={(e) => setFilters({ ...filters, includePending: e.target.checked })}
              className="accent-[var(--blue)]"
            />
            Incluir pendientes/en revisión
          </label>
        </div>
      </div>

      <div className="p-4 border-t border-[var(--line)] flex flex-col gap-2 bg-[var(--soft)] shrink-0">
        <button
          onClick={() => onGenerate(filters)}
          disabled={isGenerating || filters.projects.length === 0}
          className="w-full bg-[var(--blue)] hover:bg-[#070d75] text-white font-semibold py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Consultando..." : "Actualizar desde Jira"}
        </button>

        {hasData && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={onDownloadHtml}
              className="flex-1 bg-white border border-[var(--line)] text-[var(--text)] font-semibold py-2 rounded text-sm hover:bg-[var(--bg)] transition-colors"
            >
              Descargar HTML
            </button>
            <button
              onClick={onDownloadPdf}
              className="flex-1 bg-white border border-[var(--line)] text-[var(--text)] font-semibold py-2 rounded text-sm hover:bg-[var(--bg)] transition-colors"
            >
              Descargar PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
