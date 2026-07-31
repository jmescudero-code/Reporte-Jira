import { FilterState } from "@/components/FilterPanel";
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isAfter } from "date-fns";

export function getDatesFromFilters(filters: FilterState) {
  let start: Date;
  let end: Date; // end is inclusive for visual display
  let periodLabel = "";

  if (filters.type === "week") {
    // Basic ISO week calculation approximation
    // Find the first Thursday of the year to determine week 1
    const yearStart = new Date(filters.weekYear, 0, 1);
    const daysOffset = (yearStart.getDay() + 6) % 7;
    const firstMonday = new Date(yearStart.getTime() - daysOffset * 86400000);
    
    start = new Date(firstMonday.getTime() + (filters.weekNumber - 1) * 7 * 86400000);
    end = new Date(start.getTime() + 6 * 86400000);
    periodLabel = `Semana ${filters.weekNumber}, ${filters.weekYear}`;
  } else if (filters.type === "month") {
    start = new Date(filters.monthYear, filters.monthNumber - 1, 1);
    end = new Date(filters.monthYear, filters.monthNumber, 0);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    periodLabel = `${monthNames[filters.monthNumber - 1]} ${filters.monthYear}`;
  } else {
    start = parseISO(filters.customStart);
    end = parseISO(filters.customEnd);
    periodLabel = `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`;
  }

  const endExclusiveDate = addDays(end, 1);

  return {
    startDateStr: format(start, "yyyy-MM-dd"),
    endDateStr: format(end, "yyyy-MM-dd"), // Inclusive end
    endExclusiveDateStr: format(endExclusiveDate, "yyyy-MM-dd"), // Exclusive end for JQL
    periodLabel,
  };
}

export function buildJql(filters: FilterState, startDate: string, endExclusiveDate: string) {
  const projects = filters.projects.length > 0 
    ? `project in (${filters.projects.join(", ")})`
    : "project in (DES, HED, KPI, LG, MV, GRUPA, SPG)";

  return `${projects} AND statusCategory = Done AND resolved >= "${startDate}" AND resolved < "${endExclusiveDate}" ORDER BY project ASC, resolutiondate DESC`;
}
