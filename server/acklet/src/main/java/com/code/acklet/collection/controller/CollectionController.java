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
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/collections")
@RequiredArgsConstructor
@Tag(name = "Collections Management", description = "Endpoints for creating and browsing custom developer tool collections")
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

    @GetMapping("/me")
    @Operation(summary = "List current user collections", description = "Retrieves all collections owned by the authenticated user")
    public ResponseEntity<ApiResponse<List<CollectionResponse>>> getMyCollections(@AuthenticationPrincipal User currentUser) {
        List<CollectionResponse> collections = collectionService.getUserCollections(currentUser.getId()).stream()
                .map(collectionMapper::toCollectionResponse)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(collections, "Your collections retrieved successfully"));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get collection details", description = "Retrieves collection and member tool details by collection ID")
    public ResponseEntity<ApiResponse<CollectionResponse>> getCollection(
            @PathVariable UUID id,
            @AuthenticationPrincipal User currentUser
    ) {
        Collection collection = collectionService.getCollectionById(id);

        // Security check: if collection is private and not owned by current user
        if (!collection.isPublic() && (currentUser == null || !collection.getUser().getId().equals(currentUser.getId()))) {
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
