package com.code.acklet.tool.service;

import com.code.acklet.tool.dto.ToolKnowledgeResponseDto;
import com.code.acklet.tool.entity.knowledge.ToolKnowledge;
import com.code.acklet.tool.repository.knowledge.ToolKnowledgeRepository;
import com.code.acklet.tool.repository.knowledge.ToolMediaRepository;
import com.code.acklet.tool.repository.knowledge.ToolVersionHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolKnowledgeService {

    private final ToolKnowledgeRepository knowledgeRepository;
    private final ToolVersionHistoryRepository versionHistoryRepository;
    private final ToolMediaRepository mediaRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "tool_knowledge", key = "#toolId", unless = "#result == null")
    public ToolKnowledgeResponseDto getToolKnowledge(UUID toolId) {
        log.info("Fetching tool knowledge hub by toolId: {}", toolId);
        ToolKnowledge knowledge = knowledgeRepository.findById(toolId)
                .orElse(null);

        if (knowledge == null) {
            return buildDefaultKnowledgeResponse(toolId);
        }

        List<ToolKnowledgeResponseDto.MediaItemDto> media = mediaRepository.findByToolIdOrderByDisplayOrderAsc(toolId)
                .stream().map(m -> ToolKnowledgeResponseDto.MediaItemDto.builder()
                        .mediaType(m.getMediaType())
                        .url(m.getUrl())
                        .caption(m.getCaption())
                        .displayOrder(m.getDisplayOrder())
                        .build()).collect(Collectors.toList());

        List<ToolKnowledgeResponseDto.VersionLogDto> versions = versionHistoryRepository.findByToolIdOrderByReleaseDateDesc(toolId)
                .stream().map(v -> ToolKnowledgeResponseDto.VersionLogDto.builder()
                        .version(v.getVersion())
                        .releaseDate(v.getReleaseDate())
                        .releaseNotes(v.getReleaseNotes())
                        .upcomingFeatures(v.getUpcomingFeatures())
                        .build()).collect(Collectors.toList());

        return ToolKnowledgeResponseDto.builder()
                .toolId(knowledge.getToolId())
                .overview(knowledge.getOverview())
                .purpose(knowledge.getPurpose())
                .problemsSolved(knowledge.getProblemsSolved())
                .whoShouldUse(knowledge.getWhoShouldUse())
                .whoShouldAvoid(knowledge.getWhoShouldAvoid())
                .expectedInputs(knowledge.getExpectedInputs())
                .expectedOutputs(knowledge.getExpectedOutputs())
                .bestPractices(knowledge.getBestPractices())
                .advantages(knowledge.getAdvantages())
                .limitations(knowledge.getLimitations())
                .verifiedBadge(knowledge.isVerifiedBadge())
                .maintainer(knowledge.getMaintainer())
                .officialWebsite(knowledge.getOfficialWebsite())
                .documentationUrl(knowledge.getDocumentationUrl())
                .githubRepository(knowledge.getGithubRepository())
                .technicalDetails(knowledge.getTechnicalDetails())
                .compatibility(knowledge.getCompatibility())
                .pricingDetails(knowledge.getPricingDetails())
                .privacyDetails(knowledge.getPrivacyDetails())
                .resources(knowledge.getResources())
                .seoMetadata(knowledge.getSeoMetadata())
                .mediaItems(media)
                .versionHistory(versions)
                .build();
    }

    private ToolKnowledgeResponseDto buildDefaultKnowledgeResponse(UUID toolId) {
        // Fallback fallback DTO when no DB rows are seeded
        return ToolKnowledgeResponseDto.builder()
                .toolId(toolId)
                .overview("Acklet sandbox utility with local execution and offline capabilities.")
                .purpose("Provides local data transformations without network dependencies.")
                .problemsSolved("Network latency, cloud security breaches, and private API leakage.")
                .whoShouldUse("Developers, database administrators, and security auditing engineers.")
                .whoShouldAvoid("Users requesting collaborative multi-user live editing features.")
                .expectedInputs("Minified text, plain strings, or raw payload streams.")
                .expectedOutputs("Beautified UTF-8 structures, valid schemas, or sorted maps.")
                .bestPractices("Never input authorization credentials on unverified online sites.")
                .advantages("100% Client-side sandbox, immediate formatting, offline compatibility.")
                .limitations("File size constraints up to 100MB in browser memory.")
                .verifiedBadge(true)
                .maintainer("Acklet Core Team")
                .officialWebsite("https://acklet.io")
                .documentationUrl("https://acklet.io/docs")
                .githubRepository("https://github.com/acklet/sandbox")
                .technicalDetails(Collections.emptyMap())
                .compatibility(Collections.emptyMap())
                .pricingDetails(Collections.emptyMap())
                .privacyDetails(Collections.emptyMap())
                .resources(Collections.emptyMap())
                .seoMetadata(Collections.emptyMap())
                .mediaItems(Collections.emptyList())
                .versionHistory(Collections.emptyList())
                .build();
    }
}
