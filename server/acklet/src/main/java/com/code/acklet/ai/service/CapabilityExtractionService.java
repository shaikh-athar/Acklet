package com.code.acklet.ai.service;

import com.code.acklet.ai.entity.AiJob.JobType;
import com.code.acklet.ai.provider.AiTaskType;
import com.code.acklet.ai.provider.ProviderRouter;
import com.code.acklet.ai.prompt.PromptTemplates;
import com.code.acklet.tool.entity.Capability;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.CapabilityRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Extracts discrete capabilities from a tool's description using AI,
 * then persists them into the capabilities table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CapabilityExtractionService {

    private final ProviderRouter       router;
    private final AiJobService         jobService;
    private final CapabilityRepository capabilityRepo;
    private final ObjectMapper         objectMapper;

    @Transactional
    public void extract(Tool tool) {
        UUID toolId = tool.getId();
        String activeProvider = router.activeProviderName(AiTaskType.CAPABILITIES);

        // Pull existing overview from knowledge if available
        String overview = nullSafe(tool.getDescription());

        String prompt = PromptTemplates.CAPABILITIES.formatted(
                tool.getName(),
                nullSafe(tool.getDescription()),
                overview
        );

        var job = jobService.start(toolId, JobType.CAPABILITIES, activeProvider, prompt);
        long start = System.currentTimeMillis();

        try {
            String json = router.route(prompt, AiTaskType.CAPABILITIES);
            long latency = System.currentTimeMillis() - start;

            List<Map<String, Object>> parsed = objectMapper.readValue(
                    stripCodeFences(json),
                    new TypeReference<>() {}
            );

            // Replace existing AI-generated capabilities
            capabilityRepo.deleteByToolId(toolId);

            List<Capability> capabilities = parsed.stream().map(cap -> Capability.builder()
                    .tool(tool)
                    .name((String) cap.getOrDefault("name", "Unknown"))
                    .description((String) cap.getOrDefault("description", ""))
                    .confidence(toDouble(cap.getOrDefault("confidence", 0.8)))
                    .isAiGenerated(true)
                    .build()
            ).toList();

            capabilityRepo.saveAll(capabilities);
            jobService.done(job.getId(), Map.of("count", capabilities.size()), latency);
            log.info("Extracted {} capabilities for tool {} in {}ms", capabilities.size(), tool.getSlug(), latency);

        } catch (Exception e) {
            jobService.failed(job.getId(), e.getMessage());
            log.error("Capability extraction failed for tool {}: {}", tool.getSlug(), e.getMessage());
        }
    }

    /** Strip markdown code fences that some models add despite instructions. */
    private String stripCodeFences(String s) {
        return s.replaceAll("^```[a-z]*\\n?", "").replaceAll("```$", "").strip();
    }

    private double toDouble(Object val) {
        if (val instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return 0.8; }
    }

    private String nullSafe(String s) { return s != null ? s : ""; }
}
