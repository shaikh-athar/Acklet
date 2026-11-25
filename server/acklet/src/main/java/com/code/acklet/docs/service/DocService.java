package com.code.acklet.docs.service;

import com.code.acklet.docs.dto.*;
import com.code.acklet.docs.entity.DocDocument;
import com.code.acklet.docs.entity.DocMedia;
import com.code.acklet.docs.entity.DocSection;
import com.code.acklet.docs.entity.DocStatus;
import com.code.acklet.docs.repository.DocDocumentRepository;
import com.code.acklet.docs.repository.DocMediaRepository;
import com.code.acklet.docs.repository.DocSectionRepository;
import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import com.code.acklet.user.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocService {

    private final DocDocumentRepository docDocumentRepository;
    private final DocSectionRepository docSectionRepository;
    private final DocMediaRepository docMediaRepository;
    private final ToolRepository toolRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final DocCommunityService communityService;

    // ── Tool Scoping ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<DocToolResponse> getToolsForUser(User user) {
        List<Tool> tools = toolRepository.findByPublisherIdAndDeletedAtIsNull(user.getId(), Pageable.unpaged()).getContent();
        if (tools.isEmpty()) {
            // Fallback: If user has no self-published tools, provide all active platform tools
            tools = toolRepository.findAll().stream()
                    .filter(t -> t.getStatus() == Tool.ToolStatus.ACTIVE || t.getStatus() == Tool.ToolStatus.DRAFT)
                    .collect(Collectors.toList());
        }
        return tools.stream()
                .map(t -> DocToolResponse.builder()
                        .id(t.getId())
                        .name(t.getName())
                        .slug(t.getSlug())
                        .description(t.getDescription())
                        .icon(t.getIcon())
                        .build())
                .collect(Collectors.toList());
    }

    private String resolveToolName(UUID toolId) {
        if (toolId == null) {
            return null;
        }
        return toolRepository.findById(toolId).map(Tool::getName).orElse(null);
    }

    private Tool validateToolAccess(UUID toolId, User user) {
        if (toolId == null) {
            return null;
        }
        Tool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new ResourceNotFoundException("Tool not found: " + toolId));
        // If user is ADMIN or tool has no publisher, or user is the publisher, allow
        if (user.getRole() == User.Role.ADMIN || tool.getPublisherId() == null || user.getId().equals(tool.getPublisherId())) {
            return tool;
        }
        throw new ForbiddenException("You do not have permission to manage docs for this tool");
    }

    private DocDocument requireDocumentOwned(UUID docId, User user) {
        DocDocument doc = docDocumentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + docId));
        if (user.getRole() != User.Role.ADMIN && !user.getId().equals(doc.getOwnerId())) {
            throw new ForbiddenException("You do not own this document: " + docId);
        }
        return doc;
    }

    private DocDocument requireDocumentOwnedOrNotFound(UUID docId, User user) {
        DocDocument doc = docDocumentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found: " + docId));
        if (user.getRole() != User.Role.ADMIN && !user.getId().equals(doc.getOwnerId())) {
            // Do not leak document existence to unauthorized users
            throw new ResourceNotFoundException("Document not found: " + docId);
        }
        return doc;
    }

    // ── Document CRUD ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DocumentResponse> listDocuments(
            UUID toolId,
            String q,
            String status,
            String sort,
            int page,
            int size,
            User user) {
        if (toolId != null) {
            validateToolAccess(toolId, user);
        }

        // Validate status parameter
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
            String normStatus = status.trim().toUpperCase(Locale.ROOT);
            if (!"DRAFT".equals(normStatus) && !"PUBLISHED".equals(normStatus)) {
                throw new BadRequestException("Invalid status: " + status + ". Allowed values: ALL, DRAFT, PUBLISHED");
            }
        }

        // Validate sort parameter
        String sortKey = (sort != null && !sort.isBlank()) ? sort.trim().toLowerCase(Locale.ROOT) : "last_modified";
        Sort sortObj;
        switch (sortKey) {
            case "last_modified":
                sortObj = Sort.by(Sort.Direction.DESC, "updatedAt");
                break;
            case "title_asc":
                sortObj = Sort.by(Sort.Direction.ASC, "title");
                break;
            case "published_at":
                sortObj = Sort.by(Sort.Direction.DESC, "publishedAt").and(Sort.by(Sort.Direction.DESC, "updatedAt"));
                break;
            default:
                throw new BadRequestException("Invalid sort: " + sort + ". Allowed values: last_modified, title_asc, published_at");
        }

        // Validate pagination parameters
        if (page < 0) {
            throw new BadRequestException("Page index must not be negative");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("Page size must be between 1 and 100");
        }

        Specification<DocDocument> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (toolId != null) {
                predicates.add(cb.equal(root.get("toolId"), toolId));
            }

            if (user.getRole() != User.Role.ADMIN || toolId == null) {
                predicates.add(cb.equal(root.get("ownerId"), user.getId()));
            }

            if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
                predicates.add(cb.equal(root.get("status"), DocStatus.valueOf(status.trim().toUpperCase(Locale.ROOT))));
            }

            if (q != null && !q.trim().isBlank()) {
                String term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), term);
                Predicate summaryMatch = cb.like(cb.lower(root.get("summary")), term);
                predicates.add(cb.or(titleMatch, summaryMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<DocDocument> docPage = docDocumentRepository.findAll(spec, pageable);

        return docPage.map(doc -> toDocumentResponse(doc, resolveToolName(doc.getToolId())));
    }

    @Transactional
    public DocumentDetailResponse createDocument(CreateDocumentRequest req, User user) {
        if (req.getToolId() != null) {
            validateToolAccess(req.getToolId(), user);
        }

        DocDocument doc = DocDocument.builder()
                .toolId(req.getToolId())
                .title(req.getTitle().trim())
                .status(DocStatus.DRAFT)
                .ownerId(user.getId())
                .build();

        doc = docDocumentRepository.save(doc);

        // Auto-seed one initial section for a great editor experience
        DocSection initialSection = DocSection.builder()
                .document(doc)
                .heading("Introduction")
                .body("")
                .position(0)
                .build();
        docSectionRepository.save(initialSection);

        doc.getSections().add(initialSection);
        return toDocumentDetailResponse(doc, resolveToolName(doc.getToolId()));
    }

    @Transactional(readOnly = true)
    public DocumentDetailResponse getDocument(UUID docId, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);
        return toDocumentDetailResponse(doc, resolveToolName(doc.getToolId()));
    }

    @Transactional
    public DocumentDetailResponse updateDocument(UUID docId, UpdateDocumentRequest req, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        if (req.getTitle() != null && !req.getTitle().isBlank()) {
            doc.setTitle(req.getTitle().trim());
        }
        if (req.getStatus() != null) {
            doc.setStatus(req.getStatus());
        }
        doc.setUpdatedAt(Instant.now());
        doc = docDocumentRepository.save(doc);

        return toDocumentDetailResponse(doc, resolveToolName(doc.getToolId()));
    }

    @Transactional
    public DocumentDetailResponse duplicateDocument(UUID docId, User user) {
        DocDocument sourceDoc = requireDocumentOwnedOrNotFound(docId, user);

        String newTitle = "Copy of " + sourceDoc.getTitle();
        if (newTitle.length() > 255) {
            newTitle = newTitle.substring(0, 255);
        }

        DocDocument duplicate = DocDocument.builder()
                .toolId(sourceDoc.getToolId())
                .title(newTitle)
                .summary(sourceDoc.getSummary())
                .status(DocStatus.DRAFT) // Never copies publish state
                .slug(null)             // Gets new slug when later published
                .publishedAt(null)      // Never copies published date
                .ownerId(user.getId())
                .build();

        duplicate = docDocumentRepository.save(duplicate);

        List<DocSection> sourceSections = docSectionRepository.findByDocumentIdOrderByPositionAsc(docId);
        List<DocSection> duplicateSections = new ArrayList<>();
        for (DocSection srcSec : sourceSections) {
            DocSection newSec = DocSection.builder()
                    .document(duplicate)
                    .heading(srcSec.getHeading())
                    .body(srcSec.getBody())
                    .position(srcSec.getPosition())
                    .build();
            duplicateSections.add(docSectionRepository.save(newSec));
        }
        duplicate.setSections(duplicateSections);

        log.info("Duplicated document {} as new document {} by user {}", docId, duplicate.getId(), user.getId());
        return toDocumentDetailResponse(duplicate, resolveToolName(duplicate.getToolId()));
    }

    @Transactional
    public void deleteDocument(UUID docId, User user) {
        DocDocument doc = requireDocumentOwnedOrNotFound(docId, user);
        docDocumentRepository.delete(doc);
        log.info("Deleted document {} by user {}", docId, user.getId());
    }

    // ── Section Operations ──────────────────────────────────────────────────────

    @Transactional
    public SectionResponse createSection(UUID docId, CreateSectionRequest req, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        int targetPos;
        if (req.getPosition() != null && req.getPosition() >= 0) {
            targetPos = req.getPosition();
            // Shift subsequent sections if inserted in between
            List<DocSection> existing = docSectionRepository.findByDocumentIdOrderByPositionAsc(docId);
            for (DocSection s : existing) {
                if (s.getPosition() >= targetPos) {
                    s.setPosition(s.getPosition() + 1);
                    docSectionRepository.save(s);
                }
            }
        } else {
            targetPos = docSectionRepository.findMaxPositionByDocumentId(docId) + 1;
        }

        DocSection section = DocSection.builder()
                .document(doc)
                .heading(req.getHeading() != null ? req.getHeading().trim() : "")
                .body(req.getBody() != null ? req.getBody() : "")
                .position(targetPos)
                .build();

        section = docSectionRepository.save(section);
        doc.setUpdatedAt(Instant.now());
        docDocumentRepository.save(doc);

        return toSectionResponse(section);
    }

    @Transactional
    public SectionResponse updateSection(UUID docId, UUID sectionId, UpdateSectionRequest req, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        DocSection section = docSectionRepository.findByIdAndDocumentId(sectionId, docId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));

        if (req.getHeading() != null) {
            section.setHeading(req.getHeading().trim());
        }
        if (req.getBody() != null) {
            section.setBody(req.getBody());
        }
        section.setUpdatedAt(Instant.now());
        section = docSectionRepository.save(section);

        doc.setUpdatedAt(Instant.now());
        docDocumentRepository.save(doc);

        return toSectionResponse(section);
    }

    @Transactional
    public void deleteSection(UUID docId, UUID sectionId, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        DocSection section = docSectionRepository.findByIdAndDocumentId(sectionId, docId)
                .orElseThrow(() -> new ResourceNotFoundException("Section not found: " + sectionId));

        docSectionRepository.delete(section);

        // Re-sequence remaining sections to preserve 0..N-1 ordering
        List<DocSection> remaining = docSectionRepository.findByDocumentIdOrderByPositionAsc(docId);
        for (int i = 0; i < remaining.size(); i++) {
            DocSection s = remaining.get(i);
            if (s.getPosition() != i) {
                s.setPosition(i);
                docSectionRepository.save(s);
            }
        }

        doc.setUpdatedAt(Instant.now());
        docDocumentRepository.save(doc);
    }

    @Transactional
    public List<SectionResponse> reorderSections(UUID docId, List<UUID> sectionIds, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        List<DocSection> sections = docSectionRepository.findByDocumentIdOrderByPositionAsc(docId);
        Map<UUID, DocSection> sectionMap = sections.stream()
                .collect(Collectors.toMap(DocSection::getId, s -> s));

        if (sectionIds.size() != sections.size() || !sectionMap.keySet().containsAll(sectionIds)) {
            throw new BadRequestException("Invalid section IDs for reordering. All document sections must be provided.");
        }

        List<DocSection> updated = new ArrayList<>();
        for (int i = 0; i < sectionIds.size(); i++) {
            UUID id = sectionIds.get(i);
            DocSection section = sectionMap.get(id);
            section.setPosition(i);
            section.setUpdatedAt(Instant.now());
            updated.add(docSectionRepository.save(section));
        }

        doc.setUpdatedAt(Instant.now());
        docDocumentRepository.save(doc);

        return updated.stream()
                .sorted(Comparator.comparingInt(DocSection::getPosition))
                .map(this::toSectionResponse)
                .collect(Collectors.toList());
    }

    // ── Publishing & Public Operations ───────────────────────────────────────────

    @Transactional
    public DocumentDetailResponse publishDocument(UUID docId, PublishDocumentRequest req, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        if (req != null && req.getTitle() != null && !req.getTitle().isBlank()) {
            doc.setTitle(req.getTitle().trim());
        }

        if (doc.getTitle() == null || doc.getTitle().isBlank()) {
            throw new BadRequestException("Document title cannot be blank");
        }

        List<DocSection> sections = docSectionRepository.findByDocumentIdOrderByPositionAsc(docId);
        boolean hasBlocks = false;
        boolean hasParagraph = false;

        if (doc.getBlocks() != null && !doc.getBlocks().isBlank()) {
            try {
                JsonNode bArray = objectMapper.readTree(doc.getBlocks());
                if (bArray.isArray() && !bArray.isEmpty()) {
                    hasBlocks = true;
                    for (JsonNode b : bArray) {
                        String type = b.has("type") ? b.get("type").asText() : "";
                        if ("paragraph".equals(type) && b.has("text") && !b.get("text").asText().isBlank()) {
                            hasParagraph = true;
                        }
                        if ("image".equals(type)) {
                            if (!b.has("alt") || b.get("alt").asText().isBlank()) {
                                throw new BadRequestException("Add alt text to every image before publishing");
                            }
                        }
                    }
                }
            } catch (BadRequestException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Could not validate blocks during publish", e);
            }
        }

        if (hasBlocks) {
            if (!hasParagraph) {
                throw new BadRequestException("Add at least one paragraph to publish");
            }
        } else {
            boolean hasSectionWithHeading = sections.stream()
                    .anyMatch(s -> s.getHeading() != null && !s.getHeading().trim().isEmpty());
            if (sections.isEmpty() || !hasSectionWithHeading) {
                throw new BadRequestException("To publish, add at least one paragraph to your story");
            }
        }

        if (req != null && req.getSummary() != null) {
            doc.setSummary(req.getSummary().trim().isEmpty() ? null : req.getSummary().trim());
        }

        // Set stable slug if not already assigned
        if (doc.getSlug() == null || doc.getSlug().isBlank()) {
            doc.setSlug(generateSlug(doc.getTitle(), doc.getId()));
        }

        doc.setStatus(DocStatus.PUBLISHED);
        if (doc.getPublishedAt() == null) {
            doc.setPublishedAt(Instant.now());
        }

        // Snapshot published content to decouple public readers from ongoing draft edits
        List<PublicSectionResponse> snapshotSections = sections.stream()
                .map(s -> PublicSectionResponse.builder()
                        .heading(s.getHeading())
                        .body(s.getBody())
                        .position(s.getPosition())
                        .build())
                .collect(Collectors.toList());

        try {
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("title", doc.getTitle());
            snapshot.put("summary", doc.getSummary());
            snapshot.put("sections", snapshotSections);
            if (doc.getBlocks() != null && !doc.getBlocks().isBlank()) {
                snapshot.put("blocks", objectMapper.readTree(doc.getBlocks()));
            }
            doc.setPublishedContent(objectMapper.writeValueAsString(snapshot));
        } catch (Exception e) {
            log.warn("Failed to serialize published content snapshot for doc {}: {}", docId, e.getMessage());
        }

        doc.setUpdatedAt(Instant.now());
        doc = docDocumentRepository.save(doc);

        // Notify followers of new publication
        try {
            communityService.notifyFollowersOfPublication(user.getId(), doc);
        } catch (Exception e) {
            log.warn("Failed to dispatch publication notifications: {}", e.getMessage());
        }

        log.info("Document {} published by user {} with slug {}", docId, user.getId(), doc.getSlug());
        return toDocumentDetailResponse(doc, resolveToolName(doc.getToolId()));
    }

    @Transactional
    public DocumentDetailResponse unpublishDocument(UUID docId, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        doc.setStatus(DocStatus.DRAFT);
        // Slug and publishedAt are retained so republishing preserves the same public URL
        doc.setUpdatedAt(Instant.now());
        doc = docDocumentRepository.save(doc);

        log.info("Document {} unpublished by user {}", docId, user.getId());
        return toDocumentDetailResponse(doc, resolveToolName(doc.getToolId()));
    }

    @Transactional(readOnly = true)
    public PublicDocumentResponse getPublicDocument(String slug) {
        DocDocument doc = docDocumentRepository.findBySlugAndStatus(slug, DocStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found or unpublished: " + slug));

        Tool tool = doc.getToolId() != null ? toolRepository.findById(doc.getToolId()).orElse(null) : null;

        // If a published content snapshot exists, serve the snapshot to preserve live version while unpublished edits occur
        if (doc.getPublishedContent() != null && !doc.getPublishedContent().isBlank()) {
            try {
                com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(doc.getPublishedContent());
                String title = rootNode.has("title") ? rootNode.get("title").asText() : doc.getTitle();
                String summary = rootNode.has("summary") && !rootNode.get("summary").isNull() ? rootNode.get("summary").asText() : doc.getSummary();
                List<PublicSectionResponse> snapshotSections = new ArrayList<>();
                if (rootNode.has("sections") && rootNode.get("sections").isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode sn : rootNode.get("sections")) {
                        snapshotSections.add(PublicSectionResponse.builder()
                                .heading(sn.has("heading") ? sn.get("heading").asText() : "")
                                .body(sn.has("body") ? sn.get("body").asText() : "")
                                .position(sn.has("position") ? sn.get("position").asInt() : 0)
                                .build());
                    }
                }
                List<JsonNode> snapshotBlocks = new ArrayList<>();
                if (rootNode.has("blocks") && rootNode.get("blocks").isArray()) {
                    for (JsonNode bn : rootNode.get("blocks")) {
                        snapshotBlocks.add(bn);
                    }
                }
                return PublicDocumentResponse.builder()
                        .title(title)
                        .summary(summary)
                        .toolName(tool != null ? tool.getName() : null)
                        .toolSlug(tool != null ? tool.getSlug() : null)
                        .slug(doc.getSlug())
                        .publishedAt(doc.getPublishedAt())
                        .updatedAt(doc.getUpdatedAt())
                        .sections(snapshotSections)
                        .blocks(snapshotBlocks)
                        .build();
            } catch (Exception e) {
                log.warn("Falling back to live sections for slug {}: {}", slug, e.getMessage());
            }
        }

        List<DocSection> sections = docSectionRepository.findByDocumentIdOrderByPositionAsc(doc.getId());
        List<PublicSectionResponse> sectionResponses = sections.stream()
                .map(s -> PublicSectionResponse.builder()
                        .heading(s.getHeading())
                        .body(s.getBody())
                        .position(s.getPosition())
                        .build())
                .collect(Collectors.toList());

        List<JsonNode> liveBlocks = new ArrayList<>();
        if (doc.getBlocks() != null && !doc.getBlocks().isBlank()) {
            try {
                JsonNode parsed = objectMapper.readTree(doc.getBlocks());
                if (parsed.isArray()) {
                    parsed.forEach(liveBlocks::add);
                }
            } catch (Exception e) {
                log.warn("Failed to parse live blocks for public view", e);
            }
        }

        return PublicDocumentResponse.builder()
                .title(doc.getTitle())
                .summary(doc.getSummary())
                .toolName(tool != null ? tool.getName() : null)
                .toolSlug(tool != null ? tool.getSlug() : null)
                .slug(doc.getSlug())
                .publishedAt(doc.getPublishedAt())
                .updatedAt(doc.getUpdatedAt())
                .sections(sectionResponses)
                .blocks(liveBlocks)
                .build();
    }

    @Transactional(readOnly = true)
    public PublicDocumentResponse getPublicDocument(String toolSlug, String docSlug) {
        return getPublicDocument(docSlug);
    }

    public String generateSlug(String title, UUID docId) {
        String normalized = title == null ? "" : title.trim().toLowerCase(Locale.ROOT);
        String slug = normalized.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (slug.isBlank()) {
            slug = "doc";
        }
        if (slug.length() > 60) {
            slug = slug.substring(0, 60).replaceAll("-+$", "");
        }
        String candidate = slug;
        int counter = 2;
        while (docId != null
                ? docDocumentRepository.existsBySlugAndIdNot(candidate, docId)
                : docDocumentRepository.existsBySlug(candidate)) {
            candidate = slug + "-" + counter;
            counter++;
        }
        return candidate;
    }

    public String generateSlug(UUID toolId, String title, UUID docId) {
        return generateSlug(title, docId);
    }

    // ── Mappers ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<DocumentResponse> getPublicFeed(String q, String sort, int page, int size) {
        String sortKey = (sort != null && !sort.isBlank()) ? sort.trim().toLowerCase(Locale.ROOT) : "published_at";
        Sort sortObj;
        switch (sortKey) {
            case "last_modified":
                sortObj = Sort.by(Sort.Direction.DESC, "updatedAt");
                break;
            case "title_asc":
                sortObj = Sort.by(Sort.Direction.ASC, "title");
                break;
            case "published_at":
            default:
                sortObj = Sort.by(Sort.Direction.DESC, "publishedAt").and(Sort.by(Sort.Direction.DESC, "updatedAt"));
                break;
        }

        if (page < 0) page = 0;
        if (size < 1 || size > 100) size = 10;

        Specification<DocDocument> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), DocStatus.PUBLISHED));

            if (q != null && !q.trim().isBlank()) {
                String term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                Predicate titleMatch = cb.like(cb.lower(root.get("title")), term);
                Predicate summaryMatch = cb.like(cb.lower(root.get("summary")), term);
                predicates.add(cb.or(titleMatch, summaryMatch));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<DocDocument> docPage = docDocumentRepository.findAll(spec, pageable);

        return docPage.map(doc -> toDocumentResponse(doc, resolveToolName(doc.getToolId())));
    }

    private DocumentResponse toDocumentResponse(DocDocument doc, String toolName) {
        int count = doc.getSections() != null ? doc.getSections().size() : (int) docSectionRepository.countByDocumentId(doc.getId());
        String author = null;
        if (doc.getOwnerId() != null) {
            author = userRepository.findById(doc.getOwnerId())
                    .map(u -> {
                        String email = u.getEmail();
                        if (email != null && email.contains("@")) {
                            return email.substring(0, email.indexOf('@'));
                        }
                        return "Acklet Author";
                    })
                    .orElse("Acklet Author");
        }

        return DocumentResponse.builder()
                .id(doc.getId())
                .toolId(doc.getToolId())
                .toolName(toolName)
                .title(doc.getTitle())
                .slug(doc.getSlug())
                .summary(doc.getSummary())
                .status(doc.getStatus())
                .ownerId(doc.getOwnerId())
                .authorName(author)
                .sectionCount(count)
                .publishedAt(doc.getPublishedAt())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    // ── Block Editor & Media Operations ─────────────────────────────────────────

    @Transactional
    public DocumentDetailResponse saveBlocks(UUID docId, SaveBlocksRequest req, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        if (req.getVersion() != null && doc.getVersion() != null && !req.getVersion().equals(doc.getVersion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Document has been modified by another process. Please refresh.");
        }

        if (req.getBlocks() != null && req.getBlocks().size() > 500) {
            throw new BadRequestException("Stories cannot exceed 500 blocks");
        }

        if (req.getTitle() != null) {
            String trimmed = req.getTitle().trim();
            if (trimmed.length() > 150) {
                trimmed = trimmed.substring(0, 150);
            }
            doc.setTitle(trimmed.isEmpty() ? "Untitled Story" : trimmed);
        }

        if (req.getBlocks() != null) {
            for (JsonNode block : req.getBlocks()) {
                if (block.has("text") && block.get("text").asText().length() > 10000) {
                    throw new BadRequestException("Individual blocks cannot exceed 10,000 characters");
                }
            }
            try {
                doc.setBlocks(objectMapper.writeValueAsString(req.getBlocks()));
            } catch (Exception e) {
                throw new BadRequestException("Failed to serialize blocks JSON");
            }
        }

        doc.setUpdatedAt(Instant.now());
        doc.setVersion(doc.getVersion() != null ? doc.getVersion() + 1 : 1L);
        doc = docDocumentRepository.save(doc);

        return toDocumentDetailResponse(doc, resolveToolName(doc.getToolId()));
    }

    @Transactional
    public MediaUploadResponse uploadMedia(UUID docId, MultipartFile file, String expectedType, User user) {
        DocDocument doc = requireDocumentOwned(docId, user);

        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Upload file cannot be empty");
        }

        String mediaType = "VIDEO".equalsIgnoreCase(expectedType) ? "VIDEO" : "IMAGE";

        if ("IMAGE".equals(mediaType)) {
            if (file.getSize() > 10 * 1024 * 1024) { // 10MB
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image must be under 10 MB");
            }
            long count = docMediaRepository.countByDocumentIdAndMediaType(docId, "IMAGE");
            if (count >= 20) {
                throw new BadRequestException("Maximum 20 images per story");
            }
        } else {
            if (file.getSize() > 100 * 1024 * 1024) { // 100MB
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Video must be under 100 MB");
            }
            long count = docMediaRepository.countByDocumentIdAndMediaType(docId, "VIDEO");
            if (count >= 3) {
                throw new BadRequestException("Maximum 3 videos per story");
            }
        }

        // Verify magic bytes
        String contentType = validateMagicBytesAndGetContentType(file, mediaType);

        String ext = getFileExtension(file.getOriginalFilename(), contentType);
        String filename = UUID.randomUUID() + (ext.isEmpty() ? "" : "." + ext);

        Path uploadDir = Paths.get("uploads", "docs", docId.toString());
        try {
            Files.createDirectories(uploadDir);
            Path targetPath = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            log.error("Failed to store media file for doc {}", docId, e);
            throw new RuntimeException("Could not store file", e);
        }

        DocMedia media = DocMedia.builder()
                .documentId(docId)
                .filename(filename)
                .originalFilename(file.getOriginalFilename() != null ? file.getOriginalFilename() : filename)
                .contentType(contentType)
                .sizeBytes(file.getSize())
                .mediaType(mediaType)
                .build();
        docMediaRepository.save(media);

        String url = "/api/v1/docs/media/" + filename;
        return MediaUploadResponse.builder()
                .id(media.getId())
                .url(url)
                .filename(filename)
                .originalFilename(media.getOriginalFilename())
                .mediaType(mediaType)
                .sizeBytes(media.getSizeBytes())
                .build();
    }

    public ResponseEntity<Resource> serveMedia(String filename) {
        DocMedia media = docMediaRepository.findByFilename(filename)
                .orElseThrow(() -> new ResourceNotFoundException("Media not found: " + filename));

        Path filePath = Paths.get("uploads", "docs", media.getDocumentId().toString(), filename);
        if (!Files.exists(filePath)) {
            throw new ResourceNotFoundException("File not found on disk");
        }

        Resource resource = new FileSystemResource(filePath);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .header("Content-Security-Policy", "default-src 'none'; media-src 'self'; img-src 'self'")
                .body(resource);
    }

    private String validateMagicBytesAndGetContentType(MultipartFile file, String mediaType) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int bytesRead = is.read(header);
            if (bytesRead < 4) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Invalid or empty file content");
            }

            if ("IMAGE".equals(mediaType)) {
                // JPEG: FF D8 FF
                if (header[0] == (byte) 0xFF && header[1] == (byte) 0xD8 && header[2] == (byte) 0xFF) {
                    return "image/jpeg";
                }
                // PNG: 89 50 4E 47
                if (header[0] == (byte) 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) {
                    return "image/png";
                }
                // GIF: 47 49 46 38 ("GIF8")
                if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38) {
                    return "image/gif";
                }
                // WebP: RIFF ... WEBP (0-3 is RIFF, 8-11 is WEBP)
                if (bytesRead >= 12 &&
                        header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F' &&
                        header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
                    return "image/webp";
                }
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only JPEG, PNG, WebP, or GIF image files are permitted");
            } else {
                // MP4: header[4..7] is "ftyp"
                if (bytesRead >= 8 && header[4] == 'f' && header[5] == 't' && header[6] == 'y' && header[7] == 'p') {
                    return "video/mp4";
                }
                // WebM: 1A 45 DF A3 (EBML ID)
                if (header[0] == 0x1A && header[1] == 0x45 && header[2] == (byte) 0xDF && header[3] == (byte) 0xA3) {
                    return "video/webm";
                }
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only MP4 and WebM video files are permitted");
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read uploaded file");
        }
    }

    private String getFileExtension(String originalFilename, String contentType) {
        if ("image/jpeg".equals(contentType)) return "jpg";
        if ("image/png".equals(contentType)) return "png";
        if ("image/webp".equals(contentType)) return "webp";
        if ("image/gif".equals(contentType)) return "gif";
        if ("video/mp4".equals(contentType)) return "mp4";
        if ("video/webm".equals(contentType)) return "webm";
        if (originalFilename != null && originalFilename.contains(".")) {
            return originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        }
        return "bin";
    }

    private DocumentDetailResponse toDocumentDetailResponse(DocDocument doc, String toolName) {
        List<DocSection> sections = (doc.getSections() != null && !doc.getSections().isEmpty())
                ? doc.getSections()
                : docSectionRepository.findByDocumentIdOrderByPositionAsc(doc.getId());
        List<SectionResponse> sectionResponses = sections.stream()
                .map(this::toSectionResponse)
                .collect(Collectors.toList());

        List<JsonNode> blocks = new ArrayList<>();
        if (doc.getBlocks() != null && !doc.getBlocks().isBlank()) {
            try {
                JsonNode parsed = objectMapper.readTree(doc.getBlocks());
                if (parsed.isArray()) {
                    parsed.forEach(blocks::add);
                }
            } catch (Exception e) {
                log.warn("Failed to parse blocks JSON for doc {}", doc.getId(), e);
            }
        }

        return DocumentDetailResponse.builder()
                .id(doc.getId())
                .toolId(doc.getToolId())
                .toolName(toolName)
                .title(doc.getTitle())
                .slug(doc.getSlug())
                .summary(doc.getSummary())
                .status(doc.getStatus())
                .ownerId(doc.getOwnerId())
                .sections(sectionResponses)
                .blocks(blocks)
                .version(doc.getVersion())
                .publishedAt(doc.getPublishedAt())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    private SectionResponse toSectionResponse(DocSection section) {
        return SectionResponse.builder()
                .id(section.getId())
                .documentId(section.getDocument() != null ? section.getDocument().getId() : null)
                .heading(section.getHeading())
                .body(section.getBody())
                .position(section.getPosition())
                .createdAt(section.getCreatedAt())
                .updatedAt(section.getUpdatedAt())
                .build();
    }
}
