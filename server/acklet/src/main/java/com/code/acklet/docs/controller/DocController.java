package com.code.acklet.docs.controller;

import com.code.acklet.docs.dto.*;
import com.code.acklet.docs.service.DocService;
import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.user.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/docs")
@RequiredArgsConstructor
@Tag(name = "Acklet Docs", description = "Endpoints for managing tool documentation workspaces, documents, and ordered sections")
public class DocController {

    private final DocService docService;

    // ── Tools Available for Documentation ───────────────────────────────────────

    @GetMapping("/tools")
    @Operation(summary = "List documentation tools", description = "Retrieves all tools available to the authenticated user for documentation")
    public ResponseEntity<ApiResponse<List<DocToolResponse>>> getTools(@AuthenticationPrincipal User user) {
        List<DocToolResponse> tools = docService.getToolsForUser(user);
        return ResponseEntity.ok(ApiResponse.success(tools, "Documentation tools retrieved successfully"));
    }

    // ── Document Operations ─────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "List documents", description = "Retrieves paginated, searchable, and filtered documents for the current user or selected tool workspace")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> listDocuments(
            @RequestParam(required = false) UUID toolId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "last_modified") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal User user) {
        Page<DocumentResponse> documents = docService.listDocuments(toolId, q, status, sort, page, size, user);
        return ResponseEntity.ok(ApiResponse.success(documents, "Documents retrieved successfully"));
    }

    @PostMapping
    @Operation(summary = "Create a document", description = "Creates a new document under the selected tool workspace")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> createDocument(
            @Valid @RequestBody CreateDocumentRequest request,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse doc = docService.createDocument(request, user);
        return new ResponseEntity<>(ApiResponse.success(doc, "Document created successfully"), HttpStatus.CREATED);
    }

    @PostMapping("/{docId}/duplicate")
    @Operation(summary = "Duplicate document", description = "Creates a new draft copy of a document with all its sections")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> duplicateDocument(
            @PathVariable UUID docId,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse duplicate = docService.duplicateDocument(docId, user);
        return new ResponseEntity<>(ApiResponse.success(duplicate, "Document duplicated successfully"), HttpStatus.CREATED);
    }

    @GetMapping("/{docId}")
    @Operation(summary = "Get document details", description = "Retrieves a document with all its ordered sections")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> getDocument(
            @PathVariable UUID docId,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse doc = docService.getDocument(docId, user);
        return ResponseEntity.ok(ApiResponse.success(doc, "Document retrieved successfully"));
    }

    @PutMapping("/{docId}")
    @Operation(summary = "Update document", description = "Updates document metadata like title or publication status")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> updateDocument(
            @PathVariable UUID docId,
            @Valid @RequestBody UpdateDocumentRequest request,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse doc = docService.updateDocument(docId, request, user);
        return ResponseEntity.ok(ApiResponse.success(doc, "Document updated successfully"));
    }

    @DeleteMapping("/{docId}")
    @Operation(summary = "Delete document", description = "Deletes a document and all its sections")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable UUID docId,
            @AuthenticationPrincipal User user) {
        docService.deleteDocument(docId, user);
        return ResponseEntity.ok(ApiResponse.success(null, "Document deleted successfully"));
    }

    // ── Section Operations ──────────────────────────────────────────────────────

    @PostMapping("/{docId}/sections")
    @Operation(summary = "Add section", description = "Appends or inserts an ordered section into a document")
    public ResponseEntity<ApiResponse<SectionResponse>> createSection(
            @PathVariable UUID docId,
            @Valid @RequestBody CreateSectionRequest request,
            @AuthenticationPrincipal User user) {
        SectionResponse section = docService.createSection(docId, request, user);
        return new ResponseEntity<>(ApiResponse.success(section, "Section created successfully"), HttpStatus.CREATED);
    }

    @PutMapping("/{docId}/sections/{sectionId}")
    @Operation(summary = "Update section", description = "Updates heading and/or body of an existing section")
    public ResponseEntity<ApiResponse<SectionResponse>> updateSection(
            @PathVariable UUID docId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody UpdateSectionRequest request,
            @AuthenticationPrincipal User user) {
        SectionResponse section = docService.updateSection(docId, sectionId, request, user);
        return ResponseEntity.ok(ApiResponse.success(section, "Section updated successfully"));
    }

    @DeleteMapping("/{docId}/sections/{sectionId}")
    @Operation(summary = "Delete section", description = "Removes a section and automatically re-indexes remaining sections")
    public ResponseEntity<ApiResponse<Void>> deleteSection(
            @PathVariable UUID docId,
            @PathVariable UUID sectionId,
            @AuthenticationPrincipal User user) {
        docService.deleteSection(docId, sectionId, user);
        return ResponseEntity.ok(ApiResponse.success(null, "Section deleted successfully"));
    }

    @PutMapping("/{docId}/sections/reorder")
    @Operation(summary = "Reorder sections", description = "Reorders sections of a document according to the provided section IDs")
    public ResponseEntity<ApiResponse<List<SectionResponse>>> reorderSections(
            @PathVariable UUID docId,
            @Valid @RequestBody ReorderSectionsRequest request,
            @AuthenticationPrincipal User user) {
        List<SectionResponse> reordered = docService.reorderSections(docId, request.getSectionIds(), user);
        return ResponseEntity.ok(ApiResponse.success(reordered, "Sections reordered successfully"));
    }

    // ── Publishing & Public Endpoints ───────────────────────────────────────────

    @PostMapping("/{docId}/publish")
    @Operation(summary = "Publish document", description = "Validates rules, sets status to PUBLISHED, and assigns a public slug")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> publishDocument(
            @PathVariable UUID docId,
            @Valid @RequestBody PublishDocumentRequest request,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse doc = docService.publishDocument(docId, request, user);
        return ResponseEntity.ok(ApiResponse.success(doc, "Document published successfully"));
    }

    @PostMapping("/{docId}/unpublish")
    @Operation(summary = "Unpublish document", description = "Reverts document status to DRAFT and revokes public accessibility while retaining slug")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> unpublishDocument(
            @PathVariable UUID docId,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse doc = docService.unpublishDocument(docId, user);
        return ResponseEntity.ok(ApiResponse.success(doc, "Document unpublished successfully"));
    }

    @GetMapping("/public/feed")
    @Operation(summary = "Get community published feed", description = "Retrieves paginated, public published documents across the platform without authentication")
    public ResponseEntity<ApiResponse<Page<DocumentResponse>>> getPublicFeed(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "published_at") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<DocumentResponse> feed = docService.getPublicFeed(q, sort, page, size);
        return ResponseEntity.ok(ApiResponse.success(feed, "Community feed retrieved successfully"));
    }

    @GetMapping("/public/{slug}")
    @Operation(summary = "Get public document", description = "Retrieves a published document by global document slug without authentication")
    public ResponseEntity<ApiResponse<PublicDocumentResponse>> getPublicDocument(
            @PathVariable String slug) {
        PublicDocumentResponse doc = docService.getPublicDocument(slug);
        return ResponseEntity.ok(ApiResponse.success(doc, "Public document retrieved successfully"));
    }

    @GetMapping("/public/{toolSlug}/{docSlug}")
    @Operation(summary = "Get public document by tool and doc slug", description = "Retrieves a published document by tool slug and document slug without authentication")
    public ResponseEntity<ApiResponse<PublicDocumentResponse>> getPublicDocument(
            @PathVariable String toolSlug,
            @PathVariable String docSlug) {
        PublicDocumentResponse doc = docService.getPublicDocument(toolSlug, docSlug);
        return ResponseEntity.ok(ApiResponse.success(doc, "Public document retrieved successfully"));
    }

    // ── Block Editor & Media Endpoints ──────────────────────────────────────────

    @PutMapping("/{docId}/blocks")
    @Operation(summary = "Save blocks", description = "Atomically saves ordered blocks with optimistic concurrency check")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> saveBlocks(
            @PathVariable UUID docId,
            @RequestBody SaveBlocksRequest request,
            @AuthenticationPrincipal User user) {
        DocumentDetailResponse doc = docService.saveBlocks(docId, request, user);
        return ResponseEntity.ok(ApiResponse.success(doc, "Blocks saved successfully"));
    }

    @PostMapping(value = "/{docId}/media/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload image asset", description = "Uploads a story image asset (max 10MB, max 20 per story)")
    public ResponseEntity<ApiResponse<MediaUploadResponse>> uploadImage(
            @PathVariable UUID docId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        MediaUploadResponse response = docService.uploadMedia(docId, file, "IMAGE", user);
        return new ResponseEntity<>(ApiResponse.success(response, "Image uploaded successfully"), HttpStatus.CREATED);
    }

    @PostMapping(value = "/{docId}/media/video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload video asset", description = "Uploads a story video asset (max 100MB, max 3 per story)")
    public ResponseEntity<ApiResponse<MediaUploadResponse>> uploadVideo(
            @PathVariable UUID docId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {
        MediaUploadResponse response = docService.uploadMedia(docId, file, "VIDEO", user);
        return new ResponseEntity<>(ApiResponse.success(response, "Video uploaded successfully"), HttpStatus.CREATED);
    }

    @GetMapping("/media/{filename}")
    @Operation(summary = "Serve media asset", description = "Serves uploaded story media asset with strict security headers")
    public ResponseEntity<Resource> serveMedia(@PathVariable String filename) {
        return docService.serveMedia(filename);
    }
}
