import re

with open("src/lib/config/env.ts", "r") as f:
    content = f.read()

new_config = """export const config = {
  // Demo/MVP settings only - in production, move keys off frontend
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  browserbaseApiKey: import.meta.env.VITE_BROWSERBASE_API_KEY || '',

  // GitLab settings for Code Fix handoff
  gitlabBaseUrl: import.meta.env.VITE_GITLAB_BASE_URL || 'https://gitlab.com',
  gitlabProjectId: import.meta.env.VITE_GITLAB_PROJECT_ID || '',
  gitlabToken: import.meta.env.VITE_GITLAB_TOKEN || '',

  // Optional base URL for browser inspection
  targetAppBaseUrl: import.meta.env.VITE_TARGET_APP_BASE_URL || 'http://localhost:3000',

  // If liveMode is false, the app falls back to pure mock execution
  liveMode: import.meta.env.VITE_LIVE_MODE === 'true',
  liveGitlabMode: import.meta.env.VITE_LIVE_GITLAB_MODE === 'true',
};"""

content = re.sub(r'export const config = \{[\s\S]*?liveMode: .*?,\n\};', new_config, content)

with open("src/lib/config/env.ts", "w") as f:
    f.write(content)
