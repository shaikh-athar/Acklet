package com.code.acklet.collection.controller;

import com.code.acklet.collection.dto.CollectionRequest;
import com.code.acklet.collection.dto.CollectionResponse;
import com.code.acklet.collection.entity.Collection;
import com.code.acklet.collection.mapper.CollectionMapper;
import com.code.acklet.collection.service.CollectionService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
@Tag(name = "Collections Management", description = "Endpoints for creating, managing, and browsing custom developer tool collections")
public class CollectionController {

    private final CollectionService collectionService;
    private final CollectionMapper collectionMapper;

    @GetMapping("/public")
    @Operation(summary = "List public collections", description = "Retrieves all user tool collections marked as public")
    public ResponseEntity<ApiResponse<List<CollectionResponse>>> getPublicCollections() {
        List<CollectionResponse> collections = collectionService.getPublicCollections().stream()
                .map(collectionMapper::toCollectionResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(collections, "Public collections retrieved successfully"));
    }

    @GetMapping("/public/slug/{slug}")
    @Operation(summary = "Get public collection by slug", description = "Retrieves a public collection and its active tools by slug")
    public ResponseEntity<ApiResponse<CollectionResponse>> getPublicCollectionBySlug(@PathVariable String slug) {
        Collection collection = collectionService.getPublicCollectionBySlug(slug);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(collection), "Public collection retrieved"));
    }

    @GetMapping("/me")
    @Operation(summary = "List current user collections", description = "Retrieves paginated collections owned by the authenticated user with search and status filters")
    public ResponseEntity<ApiResponse<Page<CollectionResponse>>> getMyCollections(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "status", required = false) String status,
            Pageable pageable
    ) {
        Page<CollectionResponse> page = collectionService.getUserCollections(currentUser.getId(), query, status, pageable)
                .map(collectionMapper::toCollectionResponse);
        return ResponseEntity.ok(ApiResponse.success(page, "Your collections retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get collection details", description = "Retrieves collection and member tool details by collection ID")
    public ResponseEntity<ApiResponse<CollectionResponse>> getCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        Collection collection = collectionService.getCollectionById(id);

        if (!collection.isPublic() && collection.getStatus() != Collection.CollectionStatus.PUBLISHED
                && (currentUser == null || !collection.getUser().getId().equals(currentUser.getId()))) {
            throw new ForbiddenException("You do not have permission to view this collection");
        }

        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(collection), "Collection retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Create custom collection", description = "Creates a new tool collection owned by the authenticated user")
    public ResponseEntity<ApiResponse<CollectionResponse>> createCollection(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CollectionRequest request
    ) {
        Collection created = collectionService.createCollection(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(created), "Collection created successfully"));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update collection metadata and tools", description = "Updates details and tool associations of a collection")
    public ResponseEntity<ApiResponse<CollectionResponse>> updateCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CollectionRequest request
    ) {
        Collection updated = collectionService.updateCollection(currentUser, id, request);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(updated), "Collection updated successfully"));
    }

    @PostMapping("/{id}/duplicate")
    @Operation(summary = "Duplicate collection", description = "Creates a draft clone of an existing collection")
    public ResponseEntity<ApiResponse<CollectionResponse>> duplicateCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        Collection copy = collectionService.duplicateCollection(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(copy), "Collection duplicated successfully"));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish collection", description = "Sets collection status to PUBLISHED and makes it publicly visible")
    public ResponseEntity<ApiResponse<CollectionResponse>> publishCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        Collection published = collectionService.publishCollection(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(published), "Collection published successfully"));
    }

    @PostMapping("/{id}/unpublish")
    @Operation(summary = "Unpublish collection", description = "Reverts collection status to DRAFT and removes it from public view")
    public ResponseEntity<ApiResponse<CollectionResponse>> unpublishCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        Collection unpublished = collectionService.unpublishCollection(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(unpublished), "Collection unpublished successfully"));
    }

    @PostMapping("/{id}/archive")
    @Operation(summary = "Archive collection", description = "Sets collection status to ARCHIVED")
    public ResponseEntity<ApiResponse<CollectionResponse>> archiveCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        Collection archived = collectionService.archiveCollection(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(collectionMapper.toCollectionResponse(archived), "Collection archived successfully"));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete tool collection", description = "Soft-deletes a tool collection owned by the authenticated user")
    public ResponseEntity<ApiResponse<Void>> deleteCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        collectionService.deleteCollection(currentUser, id);
        return ResponseEntity.ok(ApiResponse.success(null, "Collection deleted successfully"));
    }
}
