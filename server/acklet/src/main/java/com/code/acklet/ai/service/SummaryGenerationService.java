package com.code.acklet.ai.service;

import com.code.acklet.ai.entity.AiJob.JobType;
import com.code.acklet.ai.provider.AiTaskType;
import com.code.acklet.ai.provider.ProviderRouter;
import com.code.acklet.ai.prompt.PromptTemplates;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.knowledge.ToolKnowledgeRepository;
import com.code.acklet.tool.entity.knowledge.ToolKnowledge;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Generates and persists an AI summary for a tool.
 * Writes the result into tool_knowledge.overview.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SummaryGenerationService {

    private final ProviderRouter         router;
    private final AiJobService           jobService;
    private final ToolKnowledgeRepository knowledgeRepo;

    @Transactional
    public void generate(Tool tool) {
        UUID toolId = tool.getId();
        String activeProvider = router.activeProviderName(AiTaskType.SUMMARY);

        String prompt = PromptTemplates.SUMMARY.formatted(
                tool.getName(),
                nullSafe(tool.getDescription()),
                tool.getCategory() != null ? tool.getCategory().getName() : "General",
                nullSafe(tool.getWebsiteUrl())
        );

        var job = jobService.start(toolId, JobType.SUMMARY, activeProvider, prompt);
        long start = System.currentTimeMillis();

        try {
            String summary = router.route(prompt, AiTaskType.SUMMARY);
            long latency = System.currentTimeMillis() - start;

            // Upsert tool_knowledge row
            ToolKnowledge knowledge = knowledgeRepo.findById(toolId)
                    .orElseGet(() -> ToolKnowledge.builder().toolId(toolId).tool(tool).build());
            knowledge.setOverview(summary.strip());
            knowledgeRepo.save(knowledge);

            jobService.done(job.getId(), Map.of("summary", summary.strip()), latency);
            log.info("Summary generated for tool {} by {} in {}ms", tool.getSlug(), activeProvider, latency);

        } catch (Exception e) {
            jobService.failed(job.getId(), e.getMessage());
            log.error("Summary generation failed for tool {}: {}", tool.getSlug(), e.getMessage());
        }
    }

    private String nullSafe(String s) { return s != null ? s : ""; }
}
