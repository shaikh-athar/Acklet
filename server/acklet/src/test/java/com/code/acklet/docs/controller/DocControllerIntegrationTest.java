package com.code.acklet.docs.controller;

import com.code.acklet.docs.dto.*;
import com.code.acklet.docs.entity.DocStatus;
import com.code.acklet.docs.service.DocService;
import com.code.acklet.shared.exception.ForbiddenException;
import com.code.acklet.shared.exception.GlobalExceptionHandler;
import com.code.acklet.shared.exception.ResourceNotFoundException;
import com.code.acklet.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class DocControllerIntegrationTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private DocService docService;

    @InjectMocks
    private DocController docController;

    private User testUser;
    private UUID toolId;
    private UUID docId;

    @BeforeEach
    void setUp() {
        toolId = UUID.randomUUID();
        docId = UUID.randomUUID();

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@acklet.com")
                .role(User.Role.USER)
                .build();

        // Custom argument resolver to inject mock User for @AuthenticationPrincipal
        HandlerMethodArgumentResolver authPrincipalResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                          NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                return testUser;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(docController)
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(authPrincipalResolver)
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/docs/tools returns list of tools")
    void testGetToolsEndpoint() throws Exception {
        DocToolResponse tool = DocToolResponse.builder()
                .id(toolId)
                .name("JSON Lens")
                .slug("datalens")
                .description("Visual JSON formatter")
                .build();

        when(docService.getToolsForUser(any(User.class))).thenReturn(List.of(tool));

        mockMvc.perform(get("/api/v1/docs/tools"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("JSON Lens"));
    }

    @Test
    @DisplayName("GET /api/v1/docs?toolId={id} returns paginated documents for tool")
    void testListDocumentsEndpoint() throws Exception {
        DocumentResponse doc = DocumentResponse.builder()
                .id(docId)
                .toolId(toolId)
                .toolName("JSON Lens")
                .title("Architecture Overview")
                .status(DocStatus.DRAFT)
                .sectionCount(3)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Page<DocumentResponse> page = new PageImpl<>(List.of(doc), PageRequest.of(0, 10), 1);
        when(docService.listDocuments(eq(toolId), any(), any(), eq("last_modified"), eq(0), eq(10), any(User.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/docs").param("toolId", toolId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].title").value("Architecture Overview"))
                .andExpect(jsonPath("$.data.content[0].sectionCount").value(3));
    }

    @Test
    @DisplayName("POST /api/v1/docs creates document successfully (201 Created)")
    void testCreateDocumentEndpoint() throws Exception {
        CreateDocumentRequest request = CreateDocumentRequest.builder()
                .toolId(toolId)
                .title("API Integration Guide")
                .build();

        DocumentDetailResponse created = DocumentDetailResponse.builder()
                .id(docId)
                .toolId(toolId)
                .toolName("JSON Lens")
                .title("API Integration Guide")
                .status(DocStatus.DRAFT)
                .sections(List.of())
                .build();

        when(docService.createDocument(any(CreateDocumentRequest.class), any(User.class))).thenReturn(created);

        mockMvc.perform(post("/api/v1/docs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("API Integration Guide"));
    }

    @Test
    @DisplayName("POST /api/v1/docs with empty title fails with 400 Bad Request")
    void testCreateDocumentInvalidTitle() throws Exception {
        CreateDocumentRequest request = CreateDocumentRequest.builder()
                .toolId(toolId)
                .title("") // Blank title
                .build();

        mockMvc.perform(post("/api/v1/docs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/v1/docs/{id} returns document details with sections")
    void testGetDocumentEndpoint() throws Exception {
        DocumentDetailResponse doc = DocumentDetailResponse.builder()
                .id(docId)
                .toolId(toolId)
                .title("API Integration Guide")
                .status(DocStatus.DRAFT)
                .sections(List.of(SectionResponse.builder()
                        .id(UUID.randomUUID())
                        .heading("Overview")
                        .body("Guide content")
                        .position(0)
                        .build()))
                .build();

        when(docService.getDocument(eq(docId), any(User.class))).thenReturn(doc);

        mockMvc.perform(get("/api/v1/docs/{id}", docId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sections[0].heading").value("Overview"));
    }

    @Test
    @DisplayName("GET /api/v1/docs/{id} for unauthorized user returns 403 Forbidden")
    void testGetDocumentForbidden() throws Exception {
        when(docService.getDocument(eq(docId), any(User.class)))
                .thenThrow(new ForbiddenException("You do not own this document: " + docId));

        mockMvc.perform(get("/api/v1/docs/{id}", docId))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/v1/docs/{id}/sections appends a new section (201 Created)")
    void testCreateSectionEndpoint() throws Exception {
        UUID secId = UUID.randomUUID();
        CreateSectionRequest request = CreateSectionRequest.builder()
                .heading("Security Considerations")
                .body("Never log tokens.")
                .build();

        SectionResponse response = SectionResponse.builder()
                .id(secId)
                .documentId(docId)
                .heading("Security Considerations")
                .body("Never log tokens.")
                .position(1)
                .build();

        when(docService.createSection(eq(docId), any(CreateSectionRequest.class), any(User.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/docs/{id}/sections", docId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.heading").value("Security Considerations"));
    }

    @Test
    @DisplayName("PUT /api/v1/docs/{id}/sections/{secId} updates section")
    void testUpdateSectionEndpoint() throws Exception {
        UUID secId = UUID.randomUUID();
        UpdateSectionRequest request = UpdateSectionRequest.builder()
                .heading("Updated Heading")
                .body("Updated Body")
                .build();

        SectionResponse response = SectionResponse.builder()
                .id(secId)
                .documentId(docId)
                .heading("Updated Heading")
                .body("Updated Body")
                .position(0)
                .build();

        when(docService.updateSection(eq(docId), eq(secId), any(UpdateSectionRequest.class), any(User.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/docs/{id}/sections/{secId}", docId, secId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.heading").value("Updated Heading"));
    }

    @Test
    @DisplayName("DELETE /api/v1/docs/{id}/sections/{secId} deletes section")
    void testDeleteSectionEndpoint() throws Exception {
        UUID secId = UUID.randomUUID();
        doNothing().when(docService).deleteSection(eq(docId), eq(secId), any(User.class));

        mockMvc.perform(delete("/api/v1/docs/{id}/sections/{secId}", docId, secId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("PUT /api/v1/docs/{id}/sections/reorder reorders sections")
    void testReorderSectionsEndpoint() throws Exception {
        UUID sec1 = UUID.randomUUID();
        UUID sec2 = UUID.randomUUID();

        ReorderSectionsRequest req = ReorderSectionsRequest.builder()
                .sectionIds(List.of(sec2, sec1))
                .build();

        List<SectionResponse> reordered = List.of(
                SectionResponse.builder().id(sec2).position(0).build(),
                SectionResponse.builder().id(sec1).position(1).build()
        );

        when(docService.reorderSections(eq(docId), eq(List.of(sec2, sec1)), any(User.class))).thenReturn(reordered);

        mockMvc.perform(put("/api/v1/docs/{id}/sections/reorder", docId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(sec2.toString()))
                .andExpect(jsonPath("$.data[0].position").value(0));
    }

    // ── Phase 2 Publishing & Public View Controller Tests ───────────────────────

    @Test
    @DisplayName("POST /api/v1/docs/{id}/publish publishes document")
    void testPublishDocumentEndpoint() throws Exception {
        PublishDocumentRequest req = PublishDocumentRequest.builder()
                .title("Publishing Guide")
                .summary("A guide to publishing.")
                .build();

        DocumentDetailResponse detail = DocumentDetailResponse.builder()
                .id(docId)
                .title("Publishing Guide")
                .slug("publishing-guide")
                .summary("A guide to publishing.")
                .status(DocStatus.PUBLISHED)
                .publishedAt(Instant.now())
                .build();

        when(docService.publishDocument(eq(docId), any(PublishDocumentRequest.class), any(User.class)))
                .thenReturn(detail);

        mockMvc.perform(post("/api/v1/docs/{id}/publish", docId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.data.slug").value("publishing-guide"));
    }

    @Test
    @DisplayName("POST /api/v1/docs/{id}/unpublish unpublishes document")
    void testUnpublishDocumentEndpoint() throws Exception {
        DocumentDetailResponse detail = DocumentDetailResponse.builder()
                .id(docId)
                .title("Publishing Guide")
                .slug("publishing-guide")
                .status(DocStatus.DRAFT)
                .build();

        when(docService.unpublishDocument(eq(docId), any(User.class)))
                .thenReturn(detail);

        mockMvc.perform(post("/api/v1/docs/{id}/unpublish", docId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.slug").value("publishing-guide"));
    }

    @Test
    @DisplayName("GET /api/v1/docs/public/{toolSlug}/{docSlug} returns public document")
    void testGetPublicDocumentEndpoint() throws Exception {
        PublicDocumentResponse response = PublicDocumentResponse.builder()
                .title("Public Guide")
                .summary("Public summary text")
                .toolName("JSON Formatter")
                .toolSlug("json-formatter")
                .slug("public-guide")
                .publishedAt(Instant.now())
                .sections(List.of(
                        PublicSectionResponse.builder().heading("Intro").body("Intro body").position(0).build()
                ))
                .build();

        when(docService.getPublicDocument("json-formatter", "public-guide")).thenReturn(response);

        mockMvc.perform(get("/api/v1/docs/public/json-formatter/public-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Public Guide"))
                .andExpect(jsonPath("$.data.toolSlug").value("json-formatter"))
                .andExpect(jsonPath("$.data.sections[0].heading").value("Intro"));
    }

    @Test
    @DisplayName("GET /api/v1/docs/public/{toolSlug}/{docSlug} returns 404 when not found or draft")
    void testGetPublicDocumentNotFound() throws Exception {
        when(docService.getPublicDocument("json-formatter", "non-existent"))
                .thenThrow(new ResourceNotFoundException("Document not found or unpublished"));

        mockMvc.perform(get("/api/v1/docs/public/json-formatter/non-existent"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    // ── Phase 3 Dashboard Management Controller Tests ───────────────────────────

    @Test
    @DisplayName("POST /api/v1/docs/{id}/duplicate duplicates document (201 Created)")
    void testDuplicateDocumentEndpoint() throws Exception {
        UUID newDocId = UUID.randomUUID();
        DocumentDetailResponse duplicate = DocumentDetailResponse.builder()
                .id(newDocId)
                .title("Copy of Public Guide")
                .status(DocStatus.DRAFT)
                .build();

        when(docService.duplicateDocument(eq(docId), any(User.class))).thenReturn(duplicate);

        mockMvc.perform(post("/api/v1/docs/{id}/duplicate", docId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(newDocId.toString()))
                .andExpect(jsonPath("$.data.title").value("Copy of Public Guide"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"));
    }

    @Test
    @DisplayName("POST /api/v1/docs/{id}/duplicate returns 404 when document not owned")
    void testDuplicateDocumentNotOwnedReturns404() throws Exception {
        when(docService.duplicateDocument(eq(docId), any(User.class)))
                .thenThrow(new ResourceNotFoundException("Document not found: " + docId));

        mockMvc.perform(post("/api/v1/docs/{id}/duplicate", docId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("DELETE /api/v1/docs/{id} returns 404 when document not owned")
    void testDeleteDocumentNotOwnedReturns404() throws Exception {
        org.mockito.Mockito.doThrow(new ResourceNotFoundException("Document not found: " + docId))
                .when(docService).deleteDocument(eq(docId), any(User.class));

        mockMvc.perform(delete("/api/v1/docs/{id}", docId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/v1/docs with search, filter, and sort query parameters")
    void testListDocumentsWithFilterParams() throws Exception {
        DocumentResponse doc = DocumentResponse.builder()
                .id(docId)
                .toolId(toolId)
                .title("Search Match")
                .status(DocStatus.PUBLISHED)
                .build();

        Page<DocumentResponse> page = new PageImpl<>(List.of(doc), PageRequest.of(1, 5), 1);
        when(docService.listDocuments(eq(toolId), eq("match"), eq("PUBLISHED"), eq("title_asc"), eq(1), eq(5), any(User.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/docs")
                        .param("toolId", toolId.toString())
                        .param("q", "match")
                        .param("status", "PUBLISHED")
                        .param("sort", "title_asc")
                        .param("page", "1")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].title").value("Search Match"));
    }
}
