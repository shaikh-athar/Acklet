package com.code.acklet.tool.service;

import com.code.acklet.ai.event.ToolSubmittedEvent;
import com.code.acklet.shared.exception.ConflictException;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.dto.CreateToolRequest;
import com.code.acklet.tool.dto.UpdateToolRequest;
import com.code.acklet.tool.entity.Category;
import com.code.acklet.tool.entity.Tag;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.entity.Tool.ToolStatus;
import com.code.acklet.tool.repository.CategoryRepository;
import com.code.acklet.tool.repository.TagRepository;
import com.code.acklet.tool.repository.ToolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.code.acklet.event.dto.ToolPublishedEventMessage;
import com.code.acklet.event.dto.ToolUpdatedEventMessage;
import com.code.acklet.event.publisher.RabbitMqEventPublisher;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Handles the tool publishing lifecycle: DRAFT → PENDING → ACTIVE.
 * Only publishers (and admins) may call create/update/submit/archive.
 * Ownership checks are enforced here — the controller passes the authenticated publisher UUID.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ToolPublishingService {

    private final ToolRepository      toolRepository;
    private final CategoryRepository  categoryRepository;
    private final TagRepository       tagRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final RabbitMqEventPublisher rabbitMqEventPublisher;

    // ─── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public Tool createDraft(UUID publisherId, CreateToolRequest req) {
        String slug = buildSlug(req.getSlug() != null ? req.getSlug() : req.getName());

        if (toolRepository.findBySlug(slug).isPresent()) {
            throw new ConflictException("A tool with slug '" + slug + "' already exists");
        }

        Category category = categoryRepository.findBySlug(req.getCategorySlug())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategorySlug()));

        Tool tool = Tool.builder()
                .name(req.getName())
                .slug(slug)
                .tagline(req.getTagline())
                .description(req.getDescription())
                .category(category)
                .publisherId(publisherId)
                .websiteUrl(req.getWebsiteUrl())
                .githubUrl(req.getGithubUrl())
                .logoUrl(req.getLogoUrl())
                .coverUrl(req.getCoverUrl())
                .pricingType(req.getPricingType() != null ? req.getPricingType() : "FREE")
                .isOpenSource(req.isOpenSource())
                .status(ToolStatus.DRAFT)
                .build();

        tool = toolRepository.save(tool);
        log.info("Tool DRAFT created: {} by publisher {}", slug, publisherId);
        return tool;
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    @Transactional
    public Tool update(UUID publisherId, String slug, UpdateToolRequest req) {
        Tool tool = requireOwned(slug, publisherId);

        if (req.getName()        != null) tool.setName(req.getName());
        if (req.getTagline()     != null) tool.setTagline(req.getTagline());
        if (req.getDescription() != null) tool.setDescription(req.getDescription());
        if (req.getWebsiteUrl()  != null) tool.setWebsiteUrl(req.getWebsiteUrl());
        if (req.getGithubUrl()   != null) tool.setGithubUrl(req.getGithubUrl());
        if (req.getLogoUrl()     != null) tool.setLogoUrl(req.getLogoUrl());
        if (req.getCoverUrl()    != null) tool.setCoverUrl(req.getCoverUrl());
        if (req.getPricingType() != null) tool.setPricingType(req.getPricingType());
        if (req.getIsOpenSource()!= null) tool.setOpenSource(req.getIsOpenSource());

        if (req.getCategorySlug() != null) {
            Category category = categoryRepository.findBySlug(req.getCategorySlug())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + req.getCategorySlug()));
            tool.setCategory(category);
        }

        return toolRepository.save(tool);
    }

    // ─── Submit for review ───────────────────────────────────────────────────

    @Transactional
    public Tool submit(UUID publisherId, String slug) {
        Tool tool = requireOwned(slug, publisherId);
        if (tool.getStatus() != ToolStatus.DRAFT) {
            throw new ConflictException("Only DRAFT tools can be submitted. Current status: " + tool.getStatus());
        }
        tool.setStatus(ToolStatus.PENDING);
        log.info("Tool {} submitted for review by publisher {}", slug, publisherId);
        Tool saved = toolRepository.save(tool);
        eventPublisher.publishEvent(new ToolSubmittedEvent(this, saved));

        // Publish to RabbitMQ Event Bus
        rabbitMqEventPublisher.publishToolPublished(ToolPublishedEventMessage.builder()
                .toolId(saved.getId())
                .slug(saved.getSlug())
                .name(saved.getName())
                .publisherId(saved.getPublisherId())
                .categorySlug(saved.getCategory() != null ? saved.getCategory().getSlug() : null)
                .build());

        return saved;
    }

    // ─── Admin: Approve / Reject ─────────────────────────────────────────────

    @Transactional
    public Tool approve(String slug) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + slug));
        tool.setStatus(ToolStatus.ACTIVE);
        log.info("Tool {} approved by admin", slug);
        return toolRepository.save(tool);
    }

    @Transactional
    public Tool reject(String slug, String reason) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + slug));
        tool.setStatus(ToolStatus.REJECTED);
        log.info("Tool {} rejected by admin. Reason: {}", slug, reason);
        return toolRepository.save(tool);
    }

    // ─── Soft Delete ─────────────────────────────────────────────────────────

    @Transactional
    public void softDelete(UUID publisherId, String slug) {
        Tool tool = requireOwned(slug, publisherId);
        tool.setStatus(ToolStatus.ARCHIVED);
        tool.setDeletedAt(Instant.now());
        toolRepository.save(tool);
        log.info("Tool {} soft-deleted by publisher {}", slug, publisherId);
    }

    // ─── Publisher tools list ─────────────────────────────────────────────────

    public Page<Tool> getMyTools(UUID publisherId, Pageable pageable) {
        return toolRepository.findByPublisherIdAndDeletedAtIsNull(publisherId, pageable);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private Tool requireOwned(String slug, UUID publisherId) {
        Tool tool = toolRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + slug));
        if (!publisherId.equals(tool.getPublisherId())) {
            throw new ForbiddenException("You do not own this tool");
        }
        return tool;
    }

    /** e.g. "JSON Diff Pro" → "json-diff-pro" */
    private String buildSlug(String input) {
        return input.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-{2,}", "-")
                .strip();
    }
}
