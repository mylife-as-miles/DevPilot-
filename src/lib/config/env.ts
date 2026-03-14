export const getEnvVar = (key: string, defaultValue: string = ''): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  // @ts-ignore - Vite compatibility
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key] as string;
  }
  return defaultValue;
};

export const config = {
  liveMode: getEnvVar('VITE_LIVE_MODE', 'false') === 'true',
  liveGitlabMode: getEnvVar('VITE_LIVE_GITLAB_MODE', 'false') === 'true',
  targetAppBaseUrl: getEnvVar('VITE_TARGET_APP_BASE_URL', 'http://localhost:3000'),

  // Gemini
  geminiApiKey: getEnvVar('VITE_GEMINI_API_KEY'),

  // Browserbase
  browserbaseApiKey: getEnvVar('VITE_BROWSERBASE_API_KEY'),
  browserbaseProjectId: getEnvVar('VITE_BROWSERBASE_PROJECT_ID'),

  // GitLab
  gitlabUrl: getEnvVar('VITE_GITLAB_URL', 'https://gitlab.com'),
  gitlabToken: getEnvVar('VITE_GITLAB_TOKEN'),
  gitlabProjectId: getEnvVar('VITE_GITLAB_PROJECT_ID'),
};
