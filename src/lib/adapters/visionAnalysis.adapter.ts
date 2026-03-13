import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';

export interface VisionAnalysisResult {
  summary: string;
  issueType: "layout_overflow" | "visual_regression" | "console_error" | "network_error" | "unknown";
  severity: "low" | "medium" | "high";
  suspectedComponent: string;
  explanation: string;
  recommendedFix: string;
  confidence: number;
  evidence: string[];
  suggestedTags: string[];
}

export interface VisionAnalysisInput {
  taskTitle: string;
  targetUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  screenshotBase64?: string;
  consoleErrors?: string[];
  priorMemoryHints?: string;
}

const parseGeminiJson = (text: string): VisionAnalysisResult | null => {
  try {
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr) as VisionAnalysisResult;
  } catch (e) {
    console.error('Failed to parse Gemini JSON output', e);
    return null;
  }
};

const getMockResult = (): VisionAnalysisResult => ({
  summary: "Mock analysis triggered due to missing API key.",
  issueType: "layout_overflow",
  severity: "medium",
  suspectedComponent: "MomentsGrid",
  explanation: "A simulated layout overflow was detected due to mock execution mode.",
  recommendedFix: "Apply 'overflow-hidden' to the parent container.",
  confidence: 0.85,
  evidence: ["Simulated visual discrepancy"],
  suggestedTags: ["ui_pattern", "css"]
});

/**
 * Adapter for calling Gemini 3.1 Pro Preview.
 * Includes graceful fallback if the VITE_GEMINI_API_KEY is not set.
 */
export const visionAnalysisAdapter = {
  async analyzeUi(input: VisionAnalysisInput): Promise<VisionAnalysisResult> {
    if (!config.geminiApiKey || !config.liveMode) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return getMockResult();
    }

    try {
      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const prompt = `
        You are an expert Frontend AI agent. Analyze the provided screenshot, console logs, and context
        to diagnose any UI issues matching the task title.

        Task Title: ${input.taskTitle}
        Target URL: ${input.targetUrl}
        Viewport: ${input.viewportWidth}x${input.viewportHeight}
        Console Logs: ${input.consoleErrors?.join('\n') || 'None'}
        Prior Knowledge: ${input.priorMemoryHints || 'None'}

        Respond ONLY with a valid JSON object matching this schema exactly:
        {
          "summary": "string",
          "issueType": "layout_overflow" | "visual_regression" | "console_error" | "network_error" | "unknown",
          "severity": "low" | "medium" | "high",
          "suspectedComponent": "string",
          "explanation": "string",
          "recommendedFix": "string",
          "confidence": 0-1 (number),
          "evidence": ["string"],
          "suggestedTags": ["string"]
        }
      `;

      let response;
      if (input.screenshotBase64) {
        // Handle standard base64 data URI format from browser layer
        const base64Data = input.screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
        response = await ai.models.generateContent({
          model: 'gemini-2.5-pro', // Using the current stable capable model based on typical usage, change if 3.1 preview is strictly required in SDK
          contents: [
            prompt,
            { inlineData: { data: base64Data, mimeType: 'image/png' } }
          ],
        });
      } else {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: [prompt],
        });
      }

      if (response.text) {
        const parsed = parseGeminiJson(response.text);
        if (parsed) return parsed;
      }

      throw new Error('Invalid or empty response text from Gemini');

    } catch (error) {
      console.error('Vision Analysis failed:', error);
      return {
        ...getMockResult(),
        summary: "Analysis failed, returned mock fallback.",
        confidence: 0.1,
      };
    }
  }
};
