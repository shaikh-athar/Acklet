package com.code.acklet.docs.service;

import com.code.acklet.docs.dto.*;
import com.code.acklet.docs.entity.DocDocument;
import com.code.acklet.docs.entity.DocSection;
import com.code.acklet.docs.entity.DocStatus;
import com.code.acklet.docs.repository.DocDocumentRepository;
import com.code.acklet.docs.repository.DocSectionRepository;
import com.code.acklet.shared.exception.BadRequestException;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocServiceTest {

    @Mock
    private DocDocumentRepository docDocumentRepository;

    @Mock
    private DocSectionRepository docSectionRepository;

    @Mock
    private ToolRepository toolRepository;

    @InjectMocks
    private DocService docService;

    private User testUser;
    private User otherUser;
    private Tool testTool;
    private UUID toolId;
    private UUID userId;
    private UUID otherUserId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        otherUserId = UUID.randomUUID();
        toolId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .email("developer@acklet.com")
                .role(User.Role.USER)
                .build();

        otherUser = User.builder()
                .id(otherUserId)
                .email("other@acklet.com")
                .role(User.Role.USER)
                .build();

        testTool = Tool.builder()
                .id(toolId)
                .name("JSON Formatter")
                .slug("json-formatter")
                .publisherId(userId)
                .status(Tool.ToolStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("getToolsForUser returns user published tools")
    void testGetToolsForUser() {
        when(toolRepository.findByPublisherIdAndDeletedAtIsNull(eq(userId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(testTool)));

        List<DocToolResponse> tools = docService.getToolsForUser(testUser);

        assertNotNull(tools);
        assertEquals(1, tools.size());
        assertEquals("JSON Formatter", tools.get(0).getName());
    }

    @Test
    @DisplayName("createDocument successfully creates document and seeds initial section")
    void testCreateDocumentSuccess() {
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        DocDocument savedDoc = DocDocument.builder()
                .id(UUID.randomUUID())
                .toolId(toolId)
                .title("Getting Started")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .sections(new ArrayList<>())
                .build();

        when(docDocumentRepository.save(any(DocDocument.class))).thenReturn(savedDoc);
        when(docSectionRepository.save(any(DocSection.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateDocumentRequest request = CreateDocumentRequest.builder()
                .toolId(toolId)
                .title("Getting Started")
                .build();

        DocumentDetailResponse response = docService.createDocument(request, testUser);

        assertNotNull(response);
        assertEquals("Getting Started", response.getTitle());
        assertEquals(DocStatus.DRAFT, response.getStatus());
        verify(docDocumentRepository, times(1)).save(any(DocDocument.class));
        verify(docSectionRepository, times(1)).save(any(DocSection.class));
    }

    @Test
    @DisplayName("createDocument succeeds without toolId (tool-independent)")
    void testCreateDocumentWithoutToolSuccess() {
        DocDocument savedDoc = DocDocument.builder()
                .id(UUID.randomUUID())
                .toolId(null)
                .title("Independent Note")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .sections(new ArrayList<>())
                .build();

        when(docDocumentRepository.save(any(DocDocument.class))).thenReturn(savedDoc);
        when(docSectionRepository.save(any(DocSection.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateDocumentRequest request = CreateDocumentRequest.builder()
                .title("Independent Note")
                .build();

        DocumentDetailResponse response = docService.createDocument(request, testUser);

        assertNotNull(response);
        assertEquals("Independent Note", response.getTitle());
        assertNull(response.getToolId());
        assertNull(response.getToolName());
        assertEquals(DocStatus.DRAFT, response.getStatus());
        verify(docDocumentRepository, times(1)).save(any(DocDocument.class));
    }

    @Test
    @DisplayName("getDocument throws ForbiddenException when accessed by another user")
    void testGetDocumentUnauthorized() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Private Doc")
                .ownerId(userId) // Owned by testUser
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));

        // otherUser attempts to access testUser's doc
        assertThrows(ForbiddenException.class, () -> docService.getDocument(docId, otherUser));
    }

    @Test
    @DisplayName("updateDocument updates title and status")
    void testUpdateDocumentSuccess() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Old Title")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docDocumentRepository.save(any(DocDocument.class))).thenAnswer(i -> i.getArgument(0));
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        UpdateDocumentRequest req = UpdateDocumentRequest.builder()
                .title("New Title")
                .status(DocStatus.PUBLISHED)
                .build();

        DocumentDetailResponse response = docService.updateDocument(docId, req, testUser);

        assertNotNull(response);
        assertEquals("New Title", response.getTitle());
        assertEquals(DocStatus.PUBLISHED, response.getStatus());
    }

    @Test
    @DisplayName("deleteDocument removes document when owned by user")
    void testDeleteDocumentSuccess() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Doc to Delete")
                .ownerId(userId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));

        docService.deleteDocument(docId, testUser);

        verify(docDocumentRepository, times(1)).delete(doc);
    }

    @Test
    @DisplayName("createSection appends section with next position")
    void testCreateSectionAppend() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .ownerId(userId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findMaxPositionByDocumentId(docId)).thenReturn(1);
        when(docSectionRepository.save(any(DocSection.class))).thenAnswer(i -> {
            DocSection s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        CreateSectionRequest req = CreateSectionRequest.builder()
                .heading("Configuration")
                .body("Set port to 8080")
                .build();

        SectionResponse section = docService.createSection(docId, req, testUser);

        assertNotNull(section);
        assertEquals("Configuration", section.getHeading());
        assertEquals(2, section.getPosition()); // maxPosition 1 + 1 = 2
    }

    @Test
    @DisplayName("updateSection modifies heading and body")
    void testUpdateSectionSuccess() {
        UUID docId = UUID.randomUUID();
        UUID secId = UUID.randomUUID();

        DocDocument doc = DocDocument.builder()
                .id(docId)
                .ownerId(userId)
                .build();

        DocSection section = DocSection.builder()
                .id(secId)
                .document(doc)
                .heading("Old Heading")
                .body("Old Body")
                .position(0)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByIdAndDocumentId(secId, docId)).thenReturn(Optional.of(section));
        when(docSectionRepository.save(any(DocSection.class))).thenAnswer(i -> i.getArgument(0));

        UpdateSectionRequest req = UpdateSectionRequest.builder()
                .heading("Updated Heading")
                .body("Updated Body")
                .build();

        SectionResponse response = docService.updateSection(docId, secId, req, testUser);

        assertNotNull(response);
        assertEquals("Updated Heading", response.getHeading());
        assertEquals("Updated Body", response.getBody());
    }

    @Test
    @DisplayName("deleteSection removes section and re-sequences positions")
    void testDeleteSectionReSequence() {
        UUID docId = UUID.randomUUID();
        UUID secId1 = UUID.randomUUID();
        UUID secId2 = UUID.randomUUID();

        DocDocument doc = DocDocument.builder().id(docId).ownerId(userId).build();

        DocSection s1 = DocSection.builder().id(secId1).document(doc).position(0).build();
        DocSection s2 = DocSection.builder().id(secId2).document(doc).position(1).build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByIdAndDocumentId(secId1, docId)).thenReturn(Optional.of(s1));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(s2));

        docService.deleteSection(docId, secId1, testUser);

        verify(docSectionRepository, times(1)).delete(s1);
        assertEquals(0, s2.getPosition()); // Re-sequenced to 0
    }

    @Test
    @DisplayName("reorderSections updates positions in atomic order")
    void testReorderSectionsSuccess() {
        UUID docId = UUID.randomUUID();
        UUID s1Id = UUID.randomUUID();
        UUID s2Id = UUID.randomUUID();

        DocDocument doc = DocDocument.builder().id(docId).ownerId(userId).build();
        DocSection s1 = DocSection.builder().id(s1Id).document(doc).position(0).build();
        DocSection s2 = DocSection.builder().id(s2Id).document(doc).position(1).build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(s1, s2));
        when(docSectionRepository.save(any(DocSection.class))).thenAnswer(i -> i.getArgument(0));

        // Reverse order: s2, then s1
        List<SectionResponse> reordered = docService.reorderSections(docId, List.of(s2Id, s1Id), testUser);

        assertEquals(2, reordered.size());
        assertEquals(s2Id, reordered.get(0).getId());
        assertEquals(0, reordered.get(0).getPosition());
        assertEquals(s1Id, reordered.get(1).getId());
        assertEquals(1, reordered.get(1).getPosition());
    }

    @Test
    @DisplayName("reorderSections throws BadRequestException when incomplete list is provided")
    void testReorderSectionsIncompleteListThrows() {
        UUID docId = UUID.randomUUID();
        UUID s1Id = UUID.randomUUID();
        UUID s2Id = UUID.randomUUID();

        DocDocument doc = DocDocument.builder().id(docId).ownerId(userId).build();
        DocSection s1 = DocSection.builder().id(s1Id).document(doc).position(0).build();
        DocSection s2 = DocSection.builder().id(s2Id).document(doc).position(1).build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(s1, s2));

        // Missing s2Id
        assertThrows(BadRequestException.class, () -> docService.reorderSections(docId, List.of(s1Id), testUser));
    }

    // ── Phase 2 Publishing & Public View Tests ──────────────────────────────────

    @Test
    @DisplayName("publishDocument succeeds, generates slug, and records published_at")
    void testPublishDocumentSuccess() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Getting Started Guide")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .build();

        DocSection section = DocSection.builder()
                .id(UUID.randomUUID())
                .document(doc)
                .heading("Introduction")
                .body("Welcome to our tool documentation.")
                .position(0)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(section));
        when(docDocumentRepository.existsBySlugAndIdNot(eq("getting-started-guide"), eq(docId)))
                .thenReturn(false);
        when(docDocumentRepository.save(any(DocDocument.class))).thenAnswer(i -> i.getArgument(0));
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        PublishDocumentRequest req = PublishDocumentRequest.builder()
                .title("Getting Started Guide")
                .summary("A quick start overview.")
                .build();

        DocumentDetailResponse response = docService.publishDocument(docId, req, testUser);

        assertNotNull(response);
        assertEquals(DocStatus.PUBLISHED, response.getStatus());
        assertEquals("getting-started-guide", response.getSlug());
        assertEquals("A quick start overview.", response.getSummary());
        assertNotNull(response.getPublishedAt());
        verify(docDocumentRepository).save(doc);
    }

    @Test
    @DisplayName("publishDocument handles slug collisions by appending suffix")
    void testPublishDocumentSlugCollision() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("API Guide")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .build();

        DocSection section = DocSection.builder()
                .id(UUID.randomUUID())
                .document(doc)
                .heading("Overview")
                .body("API details")
                .position(0)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(section));
        // First collision with 'api-guide'
        when(docDocumentRepository.existsBySlugAndIdNot(eq("api-guide"), eq(docId)))
                .thenReturn(true);
        // Second collision with 'api-guide-2'
        when(docDocumentRepository.existsBySlugAndIdNot(eq("api-guide-2"), eq(docId)))
                .thenReturn(false);
        when(docDocumentRepository.save(any(DocDocument.class))).thenAnswer(i -> i.getArgument(0));
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        PublishDocumentRequest req = PublishDocumentRequest.builder()
                .title("API Guide")
                .build();

        DocumentDetailResponse response = docService.publishDocument(docId, req, testUser);

        assertNotNull(response);
        assertEquals("api-guide-2", response.getSlug());
    }

    @Test
    @DisplayName("publishDocument throws BadRequestException when document has no sections")
    void testPublishDocumentNoSectionsThrows() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Empty Document")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(Collections.emptyList());

        PublishDocumentRequest req = PublishDocumentRequest.builder().title("Empty Document").build();

        assertThrows(BadRequestException.class, () -> docService.publishDocument(docId, req, testUser));
    }

    @Test
    @DisplayName("publishDocument throws BadRequestException when all sections have empty headings")
    void testPublishDocumentEmptyHeadingsThrows() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Headless Document")
                .status(DocStatus.DRAFT)
                .ownerId(userId)
                .build();

        DocSection section = DocSection.builder()
                .id(UUID.randomUUID())
                .document(doc)
                .heading("   ")
                .body("Some body text without heading")
                .position(0)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(section));

        PublishDocumentRequest req = PublishDocumentRequest.builder().title("Headless Document").build();

        assertThrows(BadRequestException.class, () -> docService.publishDocument(docId, req, testUser));
    }

    @Test
    @DisplayName("unpublishDocument resets status to DRAFT and keeps slug")
    void testUnpublishDocumentSuccess() {
        UUID docId = UUID.randomUUID();
        Instant originalPublishedAt = Instant.now().minusSeconds(3600);
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Published Doc")
                .slug("published-doc")
                .summary("Published summary")
                .status(DocStatus.PUBLISHED)
                .publishedAt(originalPublishedAt)
                .ownerId(userId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(docDocumentRepository.save(any(DocDocument.class))).thenAnswer(i -> i.getArgument(0));
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        DocumentDetailResponse response = docService.unpublishDocument(docId, testUser);

        assertNotNull(response);
        assertEquals(DocStatus.DRAFT, response.getStatus());
        assertEquals("published-doc", response.getSlug());
        assertEquals(originalPublishedAt, response.getPublishedAt());
    }

    @Test
    @DisplayName("getPublicDocument returns public view response for published document")
    void testGetPublicDocumentSuccess() {
        DocDocument doc = DocDocument.builder()
                .id(UUID.randomUUID())
                .toolId(toolId)
                .title("Public Documentation")
                .slug("public-doc")
                .summary("Public summary")
                .status(DocStatus.PUBLISHED)
                .publishedAt(Instant.now())
                .ownerId(userId)
                .build();

        DocSection s1 = DocSection.builder()
                .id(UUID.randomUUID())
                .document(doc)
                .heading("Section 1")
                .body("Public body content")
                .position(0)
                .build();

        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));
        when(docDocumentRepository.findBySlugAndStatus("public-doc", DocStatus.PUBLISHED))
                .thenReturn(Optional.of(doc));
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(doc.getId())).thenReturn(List.of(s1));

        PublicDocumentResponse response = docService.getPublicDocument("public-doc");

        assertNotNull(response);
        assertEquals("Public Documentation", response.getTitle());
        assertEquals("Public summary", response.getSummary());
        assertEquals("JSON Formatter", response.getToolName());
        assertEquals("json-formatter", response.getToolSlug());
        assertEquals("public-doc", response.getSlug());
        assertEquals(1, response.getSections().size());
        assertEquals("Section 1", response.getSections().get(0).getHeading());
    }

    @Test
    @DisplayName("getPublicDocument throws ResourceNotFoundException for draft document")
    void testGetPublicDocumentDraftThrowsNotFound() {
        when(docDocumentRepository.findBySlugAndStatus("draft-doc", DocStatus.PUBLISHED))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                docService.getPublicDocument("draft-doc"));
    }

    // ── Phase 3 Dashboard Management Service Tests ──────────────────────────────

    @Test
    @DisplayName("listDocuments validates query parameters and rejects invalid values")
    void testListDocumentsValidation() {
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        // Invalid status
        assertThrows(BadRequestException.class, () ->
                docService.listDocuments(toolId, null, "INVALID_STATUS", "last_modified", 0, 10, testUser));

        // Invalid sort
        assertThrows(BadRequestException.class, () ->
                docService.listDocuments(toolId, null, "ALL", "invalid_sort", 0, 10, testUser));

        // Negative page
        assertThrows(BadRequestException.class, () ->
                docService.listDocuments(toolId, null, "ALL", "last_modified", -1, 10, testUser));

        // Page size < 1
        assertThrows(BadRequestException.class, () ->
                docService.listDocuments(toolId, null, "ALL", "last_modified", 0, 0, testUser));

        // Page size > 100
        assertThrows(BadRequestException.class, () ->
                docService.listDocuments(toolId, null, "ALL", "last_modified", 0, 101, testUser));
    }

    @Test
    @DisplayName("listDocuments successfully queries repository with specification and returns Page")
    void testListDocumentsSuccess() {
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));

        DocDocument doc = DocDocument.builder()
                .id(UUID.randomUUID())
                .toolId(toolId)
                .title("API Architecture")
                .summary("Architecture details")
                .status(DocStatus.PUBLISHED)
                .ownerId(userId)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Page<DocDocument> page = new PageImpl<>(List.of(doc));
        when(docDocumentRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        Page<DocumentResponse> response = docService.listDocuments(toolId, "API", "PUBLISHED", "title_asc", 0, 10, testUser);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("API Architecture", response.getContent().get(0).getTitle());
    }

    @Test
    @DisplayName("duplicateDocument creates DRAFT copy with reset slug and published date in one transaction")
    void testDuplicateDocumentSuccess() {
        UUID docId = UUID.randomUUID();
        DocDocument sourceDoc = DocDocument.builder()
                .id(docId)
                .toolId(toolId)
                .title("Original Guide")
                .summary("Summary text")
                .status(DocStatus.PUBLISHED)
                .slug("original-guide")
                .publishedAt(Instant.now())
                .ownerId(userId)
                .build();

        DocSection s1 = DocSection.builder()
                .id(UUID.randomUUID())
                .document(sourceDoc)
                .heading("First Section")
                .body("First body")
                .position(0)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(sourceDoc));
        when(toolRepository.findById(toolId)).thenReturn(Optional.of(testTool));
        when(docDocumentRepository.save(any(DocDocument.class))).thenAnswer(i -> {
            DocDocument d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });
        when(docSectionRepository.findByDocumentIdOrderByPositionAsc(docId)).thenReturn(List.of(s1));
        when(docSectionRepository.save(any(DocSection.class))).thenAnswer(i -> {
            DocSection s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        DocumentDetailResponse duplicate = docService.duplicateDocument(docId, testUser);

        assertNotNull(duplicate);
        assertEquals("Copy of Original Guide", duplicate.getTitle());
        assertEquals("Summary text", duplicate.getSummary());
        assertEquals(DocStatus.DRAFT, duplicate.getStatus());
        assertNull(duplicate.getSlug());
        assertNull(duplicate.getPublishedAt());
        assertNotNull(duplicate.getSections());
        assertEquals(1, duplicate.getSections().size());
        assertEquals("First Section", duplicate.getSections().get(0).getHeading());
    }

    @Test
    @DisplayName("duplicateDocument throws ResourceNotFoundException (404) when not owned (no existence leak)")
    void testDuplicateDocumentNotOwnedThrowsNotFound() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .ownerId(otherUserId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));

        assertThrows(ResourceNotFoundException.class, () ->
                docService.duplicateDocument(docId, testUser));
    }

    @Test
    @DisplayName("deleteDocument throws ResourceNotFoundException (404) when not owned (no existence leak)")
    void testDeleteDocumentNotOwnedThrowsNotFound() {
        UUID docId = UUID.randomUUID();
        DocDocument doc = DocDocument.builder()
                .id(docId)
                .ownerId(otherUserId)
                .build();

        when(docDocumentRepository.findById(docId)).thenReturn(Optional.of(doc));

        assertThrows(ResourceNotFoundException.class, () ->
                docService.deleteDocument(docId, testUser));
    }

    @Test
    @DisplayName("deleteDocument throws ResourceNotFoundException (404) when already deleted")
    void testDeleteDocumentAlreadyDeletedThrowsNotFound() {
        UUID docId = UUID.randomUUID();
        when(docDocumentRepository.findById(docId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                docService.deleteDocument(docId, testUser));
    }
}
