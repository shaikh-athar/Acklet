package com.code.acklet.ai.service;

import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * AI Orchestration Service — coordinates the full enrichment pipeline for a tool.
 *
 * Pipeline (each step is independent; failure in one does NOT block the next):
 *   1. Summary Generation    → tool_knowledge.overview
 *   2. Capability Extraction → capabilities table
 *   3. SEO Generation        → tool_knowledge.seo_metadata
 *
 * The entire pipeline runs asynchronously on the AI thread pool so it never
 * blocks the HTTP request that triggered the tool submission.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiOrchestrationService {

    private final SummaryGenerationService    summaryService;
    private final CapabilityExtractionService capabilityService;
    private final SeoGenerationService        seoService;
    private final EmbeddingGenerationService  embeddingService;
    private final ToolRepository              toolRepository;

    /**
     * Entry point called by the ToolSubmittedEvent listener.
     * Annotated @Async — runs on a background thread from the AI executor pool.
     */
    @Async("aiExecutor")
    public void enrich(UUID toolId) {
        Tool tool = toolRepository.findById(toolId).orElse(null);
        if (tool == null) {
            log.warn("AI enrichment skipped — tool {} not found", toolId);
            return;
        }

        log.info("Starting AI enrichment pipeline for tool: {}", tool.getSlug());
        long pipelineStart = System.currentTimeMillis();

        runStep("Summary",      () -> summaryService.generate(tool));
        runStep("Capabilities", () -> capabilityService.extract(tool));
        runStep("SEO",          () -> seoService.generate(tool));
        runStep("Embeddings",   () -> embeddingService.embedTool(tool));

        log.info("AI enrichment pipeline completed for tool {} in {}ms",
                tool.getSlug(), System.currentTimeMillis() - pipelineStart);
    }

    /** Runs a single pipeline step, isolating its failure from other steps. */
    private void runStep(String stepName, Runnable step) {
        try {
            step.run();
        } catch (Exception e) {
            // Log but continue — one step failure must not block the rest
            log.error("AI pipeline step '{}' failed: {}", stepName, e.getMessage(), e);
        }
    }
}
