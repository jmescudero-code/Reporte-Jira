const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const envConfig = Object.fromEntries(envFile.split('\n').map(line => {
  const i = line.indexOf('=');
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}).filter(arr => arr[0]));
const jiraHost = envConfig.JIRA_HOST;
const jiraEmail = envConfig.JIRA_EMAIL;
const jiraToken = envConfig.JIRA_API_TOKEN;

const authHeader = `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString("base64")}`;

async function run() {
  const jql = `created >= -365d AND statusCategory = Done order by created desc`;
  const searchUrl = `${jiraHost}/rest/api/3/search/jql`;
  
  const res = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    },
    body: JSON.stringify({
      jql,
      maxResults: 50,
      fields: ["summary", "issuetype", "status", "project", "resolutiondate", "updated"]
    }),
  });
  
  if (!res.ok) {
    console.log("Error:", res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  console.log("Data:", JSON.stringify(data, null, 2));
  if (data.issues.length > 0) {
    const issue = data.issues[0];
    console.log(`Sample issue: ${issue.key} - ${issue.fields.summary}`);
    console.log(`- Status: ${issue.fields.status.name}`);
    console.log(`- Resolution Date: ${issue.fields.resolutiondate}`);
    console.log(`- Updated: ${issue.fields.updated}`);
  }
}

run();
