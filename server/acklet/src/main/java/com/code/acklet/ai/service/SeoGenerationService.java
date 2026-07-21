package com.code.acklet.ai.service;

import com.code.acklet.ai.entity.AiJob.JobType;
import com.code.acklet.ai.provider.AiTaskType;
import com.code.acklet.ai.provider.ProviderRouter;
import com.code.acklet.ai.prompt.PromptTemplates;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.entity.knowledge.ToolKnowledge;
import com.code.acklet.tool.repository.knowledge.ToolKnowledgeRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Generates SEO metadata (title, description, keywords, OG tags) and persists
 * them into tool_knowledge.seo_metadata JSONB column.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeoGenerationService {

    private final ProviderRouter         router;
    private final AiJobService           jobService;
    private final ToolKnowledgeRepository knowledgeRepo;
    private final ObjectMapper           objectMapper;

    @Transactional
    public void generate(Tool tool) {
        UUID toolId = tool.getId();
        String activeProvider = router.activeProviderName(AiTaskType.SEO);

        String prompt = PromptTemplates.SEO.formatted(
                tool.getName(),
                nullSafe(tool.getDescription()),
                tool.getCategory() != null ? tool.getCategory().getName() : "Developer Tools"
        );

        var job = jobService.start(toolId, JobType.SEO, activeProvider, prompt);
        long start = System.currentTimeMillis();

        try {
            String json = router.route(prompt, AiTaskType.SEO);
            long latency = System.currentTimeMillis() - start;

            Map<String, Object> seoData = objectMapper.readValue(
                    stripCodeFences(json),
                    new TypeReference<>() {}
            );

            ToolKnowledge knowledge = knowledgeRepo.findById(toolId)
                    .orElseGet(() -> ToolKnowledge.builder().toolId(toolId).tool(tool).build());
            knowledge.setSeoMetadata(seoData);
            knowledgeRepo.save(knowledge);

            jobService.done(job.getId(), seoData, latency);
            log.info("SEO metadata generated for tool {} in {}ms", tool.getSlug(), latency);

        } catch (Exception e) {
            jobService.failed(job.getId(), e.getMessage());
            log.error("SEO generation failed for tool {}: {}", tool.getSlug(), e.getMessage());
        }
    }

    private String stripCodeFences(String s) {
        return s.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").strip();
    }

    private String nullSafe(String s) { return s != null ? s : ""; }
}
