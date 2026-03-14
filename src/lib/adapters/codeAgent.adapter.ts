import { NormalizedFixRecommendation, PatchProposal, PatchFile } from '../../types';

export const codeAgentAdapter = {
  /**
   * Generates a structured fix recommendation from the raw vision analysis and memory.
   * Currently mocked to emulate the output of an LLM.
   */
  async generateFixRecommendation(
    taskId: string,
    visionAnalysisResult: any,
    repoHints: any,
    memoryContent?: string
  ): Promise<NormalizedFixRecommendation> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    // In a real implementation, this would format the raw UI vision analysis
    // and context into a prompt for a code-specialized LLM to map visual issues
    // back to the logical codebase components.

    const candidate = repoHints?.candidateFiles?.[0] || 'src/components/MomentsGrid.tsx';

    return {
      taskId,
      issueType: visionAnalysisResult.issueType || "layout_overflow",
      suspectedComponent: visionAnalysisResult.suspectedComponent || "MomentsGrid",
      suspectedFiles: [candidate],
      explanation: `The visual overflow corresponds to the flex container in ${candidate}. ${memoryContent ? 'Based on memory: ' + memoryContent : ''}`,
      recommendedFix: "Apply overflow-x-auto and hide scrollbars to the parent wrapper.",
      evidence: ["Visual clipping detected on element .card-header"],
      tags: ["css", "responsive_layout", "react"],
      confidence: 0.88,
      sourceArtifactIds: []
    };
  },

  /**
   * Generates a fully fleshed out patch proposal given the normalized recommendation.
   * Mocked for demo mode. Future iterations will call a GitLab Duo endpoint.
   */
  async proposePatch(
    taskId: string,
    recommendation: NormalizedFixRecommendation
  ): Promise<{ proposal: PatchProposal, files: PatchFile[] }> {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const proposalId = crypto.randomUUID();

    const proposal: PatchProposal = {
      id: proposalId,
      taskId,
      source: "mock_code_agent",
      status: "ready_for_review",
      title: `Fix ${recommendation.issueType} in ${recommendation.suspectedComponent}`,
      summary: recommendation.recommendedFix,
      suspectedFiles: recommendation.suspectedFiles,
      recommendedStrategy: "Refactor parent container CSS to manage horizontal overflow appropriately without clipping inner cards.",
      explanation: recommendation.explanation,
      confidence: recommendation.confidence,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const targetFile = recommendation.suspectedFiles[0] || 'src/components/MomentsGrid.tsx';

    const filePatch: PatchFile = {
      id: crypto.randomUUID(),
      proposalId,
      taskId,
      filePath: targetFile,
      changeType: "update",
      explanation: "Added overflow-x-auto and removed hardcoded max-width.",
      patch: `--- a/${targetFile}
+++ b/${targetFile}
@@ -24,7 +24,7 @@
 export const MomentsGrid = ({ items }: Props) => {
   return (
-    <div className="flex flex-row gap-4 w-full overflow-hidden">
+    <div className="flex flex-row gap-4 w-full overflow-x-auto scrollbar-hide">
       {items.map(item => (
         <MomentCard key={item.id} data={item} />
       ))}
     </div>
   );
 };`,
      createdAt: Date.now()
    };

    return { proposal, files: [filePatch] };
  }
};
