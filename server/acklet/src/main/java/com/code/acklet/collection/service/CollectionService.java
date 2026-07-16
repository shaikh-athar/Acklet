package com.code.acklet.collection.service;

import com.code.acklet.collection.dto.CollectionRequest;
import com.code.acklet.collection.entity.Collection;
import com.code.acklet.collection.repository.CollectionRepository;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final ToolRepository toolRepository;

    public List<Collection> getPublicCollections() {
        return collectionRepository.findByIsPublicTrue();
    }

    public List<Collection> getUserCollections(UUID userId) {
        return collectionRepository.findByUserId(userId);
    }

    public Collection getCollectionById(UUID id) {
        return collectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Collection not found with id: " + id));
    }

    @Transactional
    public Collection createCollection(User user, CollectionRequest request) {
        List<Tool> tools = List.of();
        if (request.getToolIds() != null && !request.getToolIds().isEmpty()) {
            tools = toolRepository.findAllById(request.getToolIds());
        }

        Collection collection = Collection.builder()
                .user(user)
                .name(request.getName())
                .description(request.getDescription())
                .isPublic(request.isPublic())
                .tools(tools)
                .build();

        return collectionRepository.save(collection);
    }

    @Transactional
    public Collection updateCollection(User user, UUID id, CollectionRequest request) {
        Collection collection = getCollectionById(id);

        // Validate Ownership
        if (!collection.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You do not own this collection");
        }

        List<Tool> tools = List.of();
        if (request.getToolIds() != null && !request.getToolIds().isEmpty()) {
            tools = toolRepository.findAllById(request.getToolIds());
        }

        collection.setName(request.getName());
        collection.setDescription(request.getDescription());
        collection.setPublic(request.isPublic());
        collection.setTools(tools);

        return collectionRepository.save(collection);
    }

    @Transactional
    public void deleteCollection(User user, UUID id) {
        Collection collection = getCollectionById(id);

        // Validate Ownership
        if (!collection.getUser().getId().equals(user.getId())) {
            throw new ForbiddenException("You do not own this collection");
        }

        // Soft Delete
        collection.setDeletedAt(Instant.now());
        collectionRepository.save(collection);
    }
}
