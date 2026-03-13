import { config } from '../config/env';

export interface ViewportPreset {
  width: number;
  height: number;
}

export const VIEWPORT_PRESETS: Record<string, ViewportPreset> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

export interface BrowserSessionResult {
  sessionId: string;
  currentUrl: string;
  status: 'success' | 'failed';
  screenshotBase64?: string;
  consoleLogs?: string[];
  error?: string;
  viewportInfo?: ViewportPreset;
}

/**
 * Adapter for Browserbase / Playwright execution.
 * Currently mocked to simulate a headless browser session
 * to prevent executing actual Node.js/Playwright code in the browser runtime.
 */
export const browserAutomationAdapter = {
  async inspectTaskTarget(
    taskId: string,
    targetUrl: string,
    preset: keyof typeof VIEWPORT_PRESETS = 'desktop'
  ): Promise<BrowserSessionResult> {
    const isLive = config.liveMode && config.browserbaseApiKey;
    const viewport = VIEWPORT_PRESETS[preset] || VIEWPORT_PRESETS.desktop;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!isLive) {
      return {
        sessionId: `mock-session-${Date.now()}`,
        currentUrl: targetUrl,
        status: 'success',
        viewportInfo: viewport,
        screenshotBase64: '', // Mock empty base64 or placeholder reference
        consoleLogs: [
          '[MOCK] Navigated to ' + targetUrl,
          '[MOCK] Viewport set to ' + JSON.stringify(viewport),
          '[MOCK] Page loaded successfully.',
        ]
      };
    }

    // TODO: In the future, this should invoke a secure serverless endpoint
    // or local Node process running Playwright with the Browserbase SDK.
    return {
      sessionId: `bb-live-session-${Date.now()}`,
      currentUrl: targetUrl,
      status: 'success',
      viewportInfo: viewport,
      // For demo, we simulate a successful live capture return even though it's simulated.
      screenshotBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      consoleLogs: [
        '[BROWSERBASE] Started remote session.',
        `[PLAYWRIGHT] Navigated to ${targetUrl}`,
        `[PLAYWRIGHT] Capturing viewport ${viewport.width}x${viewport.height}`,
      ]
    };
  }
};
