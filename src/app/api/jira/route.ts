import { NextResponse } from "next/server";
import { FilterState } from "@/components/FilterPanel";
import { getDatesFromFilters, buildJql } from "@/utils/jiraLogic";
import { format, isAfter, parseISO } from "date-fns";
import { ReportData, ReportProject, ReportFront, ReportIssue, JiraIssue } from "@/types/jira";

export async function POST(req: Request) {
  try {
    const filters: FilterState = await req.json();
    const { startDateStr, endDateStr, endExclusiveDateStr, periodLabel } = getDatesFromFilters(filters);
    const jql = buildJql(filters, startDateStr, endExclusiveDateStr);

    const jiraHost = process.env.JIRA_HOST;
    const jiraEmail = process.env.JIRA_EMAIL;
    const jiraToken = process.env.JIRA_API_TOKEN;

    if (!jiraHost || !jiraEmail || !jiraToken) {
      return NextResponse.json({ error: "Missing Jira credentials" }, { status: 500 });
    }

    const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64")}`;

    // 1. Search issues using JQL
    const searchUrl = `${jiraHost}/rest/api/3/search/jql`;
    const searchRes = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        jql,
        maxResults: 1000,
        fields: [
          "summary", "issuetype", "status", "project", 
          "parent", "duedate", "resolutiondate", "created", "updated"
        ],
      }),
    });

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      console.error("Jira search failed:", errorText);
      return NextResponse.json({ error: `Jira HTTP ${searchRes.status}: ${errorText}` }, { status: 500 });
    }

    const searchData = await searchRes.json();
    const issues = searchData.issues || [];

    // Helper to fetch single issue for missing parent/epic info
    const fetchIssue = async (key: string) => {
      const res = await fetch(`${jiraHost}/rest/api/3/issue/${key}?fields=summary,issuetype,parent,project`, {
        headers: { "Authorization": authHeader }
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    };

    // Cache to avoid refetching the same parent multiple times
    const issueCache: Record<string, any> = {};
    const getCachedIssue = async (key: string) => {
      if (!issueCache[key]) {
        issueCache[key] = await fetchIssue(key);
      }
      return issueCache[key];
    };

    const parsedIssues: JiraIssue[] = [];

    // 2. Process issues and fetch missing hierarchy (epic/parent)
    for (const issue of issues) {
      const type = issue.fields.issuetype?.name || "";
      const isEpic = type.toLowerCase().includes("epic") || type.toLowerCase().includes("épica");
      
      let epicKey = isEpic ? issue.key : undefined;
      let epicTitle = isEpic ? issue.fields.summary : undefined;
      let parentKey = issue.fields.parent?.key;
      let parentTitle = issue.fields.parent?.fields?.summary;

      // Hierarchy resolution
      if (!isEpic && parentKey) {
        const parentIssue = await getCachedIssue(parentKey);
        if (parentIssue) {
          parentTitle = parentIssue.fields?.summary;
          const parentType = parentIssue.fields?.issuetype?.name || "";
          const isParentEpic = parentType.toLowerCase().includes("epic") || parentType.toLowerCase().includes("épica");
          
          if (isParentEpic) {
            epicKey = parentIssue.key;
            epicTitle = parentIssue.fields.summary;
          } else {
            // It's a subtask, the parent is a task. Check if task has an epic.
            const grandParentKey = parentIssue.fields?.parent?.key;
            if (grandParentKey) {
              const grandParentIssue = await getCachedIssue(grandParentKey);
              if (grandParentIssue) {
                epicKey = grandParentIssue.key;
                epicTitle = grandParentIssue.fields?.summary;
              }
            }
          }
        }
      }

      const resolvedDate = issue.fields.resolutiondate || "";
      const dueDate = issue.fields.duedate;
      const createdDate = issue.fields.created || "";
      const updatedDate = issue.fields.updated || "";
      const isLate = !!(dueDate && resolvedDate && isAfter(parseISO(resolvedDate), parseISO(dueDate)));

      parsedIssues.push({
        key: issue.key,
        title: issue.fields.summary,
        type,
        status: issue.fields.status?.name || "",
        statusCategory: issue.fields.status?.statusCategory?.name || "",
        projectKey: issue.fields.project?.key || "",
        projectName: issue.fields.project?.name || "",
        resolvedDate,
        createdDate,
        updatedDate,
        dueDate,
        webUrl: `${jiraHost}/browse/${issue.key}`,
        parentKey,
        parentTitle,
        epicKey,
        epicTitle,
        isLate,
      });
    }

    // 3. Group by project and epic
    const projectsMap = new Map<string, ReportProject>();

    for (const issue of parsedIssues) {
      if (!projectsMap.has(issue.projectKey)) {
        projectsMap.set(issue.projectKey, {
          projectKey: issue.projectKey,
          projectName: issue.projectName,
          totalClosures: 0,
          fronts: [],
        });
      }
      
      const proj = projectsMap.get(issue.projectKey)!;
      proj.totalClosures++;

      const fKey = issue.epicKey || "NO_EPIC";
      const fTitle = issue.epicTitle || "Sin épica identificada";

      let front = proj.fronts.find((f) => f.epicKey === fKey);
      if (!front) {
        front = { epicKey: fKey, epicTitle: fTitle, issues: [] };
        proj.fronts.push(front);
      }

      // Short resolved date like 12/07/2026
      const shortResolvedDate = issue.resolvedDate 
        ? format(parseISO(issue.resolvedDate), "dd/MM/yyyy") 
        : "";

      // Context logic
      let parentContext = "";
      if (issue.type.toLowerCase().includes("subtask") || issue.type.toLowerCase().includes("subtarea")) {
        parentContext = issue.parentTitle ? `Subtarea de: ${issue.parentTitle}` : "Subtarea sin padre identificado";
      } else if (!issue.epicKey && issue.parentTitle) {
        parentContext = `Padre: ${issue.parentTitle}`;
      }

      front.issues.push({
        key: issue.key,
        title: issue.title,
        status: issue.status,
        resolvedDate: issue.resolvedDate,
        shortResolvedDate,
        createdDate: issue.createdDate,
        updatedDate: issue.updatedDate,
        url: issue.webUrl,
        parentContext,
        isLate: issue.isLate,
      });
    }

    // Include empty projects if requested
    if (filters.showEmptySpaces) {
      for (const p of filters.projects) {
        if (!projectsMap.has(p)) {
          projectsMap.set(p, {
            projectKey: p,
            projectName: p, // Should ideally fetch names of empty ones, but fallback to key
            totalClosures: 0,
            fronts: []
          });
        }
      }
    }

    const projectsArray = Array.from(projectsMap.values()).sort((a, b) => a.projectKey.localeCompare(b.projectKey));
    
    // Sort fronts and issues
    for (const proj of projectsArray) {
      proj.fronts.sort((a, b) => a.epicTitle.localeCompare(b.epicTitle));
      for (const front of proj.fronts) {
        front.issues.sort((a, b) => {
          // Sort by resolvedDate desc
          return new Date(b.resolvedDate).getTime() - new Date(a.resolvedDate).getTime();
        });
      }
    }

    const totalClosures = parsedIssues.length;
    const projectsWithClosures = Array.from(projectsMap.values()).filter(p => p.totalClosures > 0).length;
    let frontsWithProgress = 0;
    projectsArray.forEach(p => { frontsWithProgress += p.fronts.length; });
    const lateClosures = parsedIssues.filter(i => i.isLate).length;

    const reportData: ReportData = {
      title: "Informe Jira",
      periodLabel,
      startDate: format(parseISO(startDateStr), "dd/MM/yyyy"),
      endDate: format(parseISO(endDateStr), "dd/MM/yyyy"),
      endExclusiveDate: endExclusiveDateStr,
      totalClosures,
      projectsWithClosures,
      frontsWithProgress,
      lateClosures,
      projects: projectsArray,
    };

    console.log("Jira query returned issues:", totalClosures, "Projects:", projectsArray.length);

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
