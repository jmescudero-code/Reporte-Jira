export type JiraIssue = {
  key: string;
  title: string;
  type: string;
  status: string;
  statusCategory: string;
  projectKey: string;
  projectName: string;
  resolvedDate: string;
  dueDate?: string | null;
  webUrl?: string;
  parentKey?: string;
  parentTitle?: string;
  epicKey?: string;
  epicTitle?: string;
  isLate: boolean;
};

export type ReportIssue = {
  key: string;
  title: string;
  status: string;
  resolvedDate: string;
  shortResolvedDate: string;
  url?: string;
  parentContext?: string;
  isLate: boolean;
};

export type ReportFront = {
  epicKey: string;
  epicTitle: string;
  issues: ReportIssue[];
};

export type ReportProject = {
  projectKey: string;
  projectName: string;
  totalClosures: number;
  fronts: ReportFront[];
};

export type ReportData = {
  title: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  endExclusiveDate: string;
  totalClosures: number;
  projectsWithClosures: number;
  frontsWithProgress: number;
  lateClosures: number;
  projects: ReportProject[];
};
