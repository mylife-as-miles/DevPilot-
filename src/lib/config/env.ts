export const config = {
  // Demo/MVP settings only - in production, move keys off frontend
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  browserbaseApiKey: import.meta.env.VITE_BROWSERBASE_API_KEY || '',

  // Optional base URL for browser inspection
  targetAppBaseUrl: import.meta.env.VITE_TARGET_APP_BASE_URL || 'http://localhost:3000',

  // If liveMode is false, the app falls back to pure mock execution
  liveMode: import.meta.env.VITE_LIVE_MODE === 'true',
};

export const hasRequiredIntegrations = () => {
  return Boolean(config.geminiApiKey && config.browserbaseApiKey && config.liveMode);
};
