package com.code.acklet.collection.service;

import com.code.acklet.collection.dto.CollectionRequest;
import com.code.acklet.collection.entity.Collection;
import com.code.acklet.collection.entity.Collection.CollectionStatus;
import com.code.acklet.collection.repository.CollectionRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.entity.Tool.ToolStatus;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final ToolRepository toolRepository;

    public Page<Collection> getUserCollections(UUID userId, String query, String status, Pageable pageable) {
        boolean hasQuery = query != null && !query.trim().isEmpty();
        boolean hasStatus = status != null && !status.equalsIgnoreCase("ALL") && !status.trim().isEmpty();

        if (hasQuery && hasStatus) {
            try {
                CollectionStatus colStatus = CollectionStatus.valueOf(status.toUpperCase().trim());
                return collectionRepository.findByUserIdAndStatusAndNameContainingIgnoreCase(userId, colStatus, query.trim(), pageable);
            } catch (IllegalArgumentException e) {
                return collectionRepository.findByUserIdAndNameContainingIgnoreCase(userId, query.trim(), pageable);
            }
        } else if (hasQuery) {
            return collectionRepository.findByUserIdAndNameContainingIgnoreCase(userId, query.trim(), pageable);
        } else if (hasStatus) {
            try {
                CollectionStatus colStatus = CollectionStatus.valueOf(status.toUpperCase().trim());
                return collectionRepository.findByUserIdAndStatus(userId, colStatus, pageable);
            } catch (IllegalArgumentException e) {
                return collectionRepository.findByUserId(userId, pageable);
            }
        } else {
            return collectionRepository.findByUserId(userId, pageable);
        }
    }

    public List<Collection> getPublicCollections() {
        List<Collection> collections = collectionRepository.findByIsPublicTrue();
        // Safe tool filtering: only show active published tools in public view
        for (Collection c : collections) {
            filterActiveTools(c);
        }
        return collections;
    }

    public Collection getPublicCollectionBySlug(String slug) {
        Collection collection = collectionRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found: " + slug));

        if (!collection.isPublic() && collection.getStatus() != CollectionStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Collection is not published: " + slug);
        }

        // Safe tool filtering: only show active published tools in public view
        filterActiveTools(collection);
        return collection;
    }

    public Collection getCollectionById(UUID id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found with id: " + id));
    }

    @Transactional
    public Collection createCollection(User user, CollectionRequest request) {
        List<Tool> tools = resolveOrderedTools(request.getToolIds());
        String slug = buildUniqueSlug(request.getSlug(), request.getName());

        CollectionStatus status = CollectionStatus.DRAFT;
        if (request.getStatus() != null) {
            try {
                status = CollectionStatus.valueOf(request.getStatus().toUpperCase().trim());
            } catch (IllegalArgumentException ignored) {}
        }

        Collection collection = Collection.builder()
                .user(user)
                .name(request.getName().trim())
                .slug(slug)
                .coverImage(request.getCoverImage())
                .description(request.getDescription())
                .introduction(request.getIntroduction())
                .isPublic(request.isPublic() || status == CollectionStatus.PUBLISHED)
                .status(status)
                .publishedAt(status == CollectionStatus.PUBLISHED ? Instant.now() : null)
                .seoMetadata(request.getSeoMetadata())
                .tools(tools)
                .build();

        log.info("[Collection Service] Created collection: {} ({}) for user: {}", collection.getName(), slug, user.getId());
        return collectionRepository.save(collection);
    }

    @Transactional
    public Collection updateCollection(User user, UUID id, CollectionRequest request) {
        Collection collection = getCollectionById(id);
        requireOwnership(collection, user);

        if (request.getName() != null && !request.getName().isBlank()) {
            collection.setName(request.getName().trim());
        }
        if (request.getCoverImage() != null) {
            collection.setCoverImage(request.getCoverImage());
        }
        if (request.getDescription() != null) {
            collection.setDescription(request.getDescription());
        }
        if (request.getIntroduction() != null) {
            collection.setIntroduction(request.getIntroduction());
        }
        if (request.getSeoMetadata() != null) {
            collection.setSeoMetadata(request.getSeoMetadata());
        }

        if (request.getStatus() != null) {
            try {
                CollectionStatus newStatus = CollectionStatus.valueOf(request.getStatus().toUpperCase().trim());
                collection.setStatus(newStatus);
                collection.setPublic(newStatus == CollectionStatus.PUBLISHED);
                if (newStatus == CollectionStatus.PUBLISHED && collection.getPublishedAt() == null) {
                    collection.setPublishedAt(Instant.now());
                }
            } catch (IllegalArgumentException ignored) {}
        } else {
            collection.setPublic(request.isPublic());
        }

        if (request.getToolIds() != null) {
            collection.setTools(resolveOrderedTools(request.getToolIds()));
        }

        log.info("[Collection Service] Updated collection: {} ({})", collection.getName(), collection.getId());
        return collectionRepository.save(collection);
    }

    @Transactional
    public Collection duplicateCollection(User user, UUID id) {
        Collection source = getCollectionById(id);
        requireOwnership(source, user);

        String duplicateName = "Copy of " + source.getName();
        String duplicateSlug = buildUniqueSlug(null, duplicateName);

        Collection copy = Collection.builder()
                .user(user)
                .name(duplicateName)
                .slug(duplicateSlug)
                .coverImage(source.getCoverImage())
                .description(source.getDescription())
                .introduction(source.getIntroduction())
                .isPublic(false)
                .status(CollectionStatus.DRAFT)
                .seoMetadata(source.getSeoMetadata())
                .tools(new ArrayList<>(source.getTools()))
                .build();

        log.info("[Collection Service] Duplicated collection: {} as {}", source.getId(), duplicateSlug);
        return collectionRepository.save(copy);
    }

    @Transactional
    public Collection publishCollection(User user, UUID id) {
        Collection collection = getCollectionById(id);
        requireOwnership(collection, user);

        collection.setStatus(CollectionStatus.PUBLISHED);
        collection.setPublic(true);
        if (collection.getPublishedAt() == null) {
            collection.setPublishedAt(Instant.now());
        }
        log.info("[Collection Service] Published collection: {}", collection.getSlug());
        return collectionRepository.save(collection);
    }

    @Transactional
    public Collection unpublishCollection(User user, UUID id) {
        Collection collection = getCollectionById(id);
        requireOwnership(collection, user);

        collection.setStatus(CollectionStatus.DRAFT);
        collection.setPublic(false);
        log.info("[Collection Service] Unpublished collection: {}", collection.getSlug());
        return collectionRepository.save(collection);
    }

    @Transactional
    public Collection archiveCollection(User user, UUID id) {
        Collection collection = getCollectionById(id);
        requireOwnership(collection, user);

        collection.setStatus(CollectionStatus.ARCHIVED);
        collection.setPublic(false);
        log.info("[Collection Service] Archived collection: {}", collection.getSlug());
        return collectionRepository.save(collection);
    }

    @Transactional
    public void deleteCollection(User user, UUID id) {
        Collection collection = getCollectionById(id);
        requireOwnership(collection, user);

        collection.setDeletedAt(Instant.now());
        collectionRepository.save(collection);
        log.info("[Collection Service] Soft deleted collection: {}", id);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void requireOwnership(Collection collection, User user) {
        if (!collection.getUser().getId().equals(user.getId()) && user.getRole() != User.Role.ADMIN) {
            throw new ForbiddenException("You do not own this collection");
        }
    }

    private List<Tool> resolveOrderedTools(List<UUID> toolIds) {
        if (toolIds == null || toolIds.isEmpty()) {
            return new ArrayList<>();
        }
        List<Tool> found = toolRepository.findAllById(toolIds);
        Map<UUID, Tool> toolMap = found.stream().collect(Collectors.toMap(Tool::getId, t -> t));
        List<Tool> ordered = new ArrayList<>();
        for (UUID id : toolIds) {
            Tool t = toolMap.get(id);
            if (t != null) {
                ordered.add(t);
            }
        }
        return ordered;
    }

    private void filterActiveTools(Collection collection) {
        if (collection.getTools() != null) {
            List<Tool> activeOnly = collection.getTools().stream()
                    .filter(t -> t.getStatus() == ToolStatus.ACTIVE)
                    .toList();
            collection.setTools(new ArrayList<>(activeOnly));
        }
    }

    private String buildUniqueSlug(String explicitSlug, String name) {
        String base = (explicitSlug != null && !explicitSlug.trim().isEmpty())
                ? explicitSlug.trim().toLowerCase()
                : (name != null ? name.trim().toLowerCase() : "collection");

        base = base.replaceAll("[^a-z0-9\\s-]", "").replaceAll("\\s+", "-").replaceAll("-+", "-");
        if (base.isEmpty()) {
            base = "collection";
        }

        if (collectionRepository.findBySlug(base).isEmpty()) {
            return base;
        }

        String candidate;
        int count = 1;
        do {
            candidate = base + "-" + (count == 1 ? UUID.randomUUID().toString().substring(0, 6) : count);
            count++;
        } while (collectionRepository.findBySlug(candidate).isPresent());

        return candidate;
    }
}
