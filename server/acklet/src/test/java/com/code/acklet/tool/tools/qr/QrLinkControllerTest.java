package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.controller.QrLinkController;
import com.code.acklet.tool.tools.qr.dto.*;
import com.code.acklet.tool.tools.qr.service.QrLinkService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class QrLinkControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private QrLinkService qrLinkService;

    @BeforeEach
    void setUp() {
        QrLinkController controller = new QrLinkController(qrLinkService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("POST /api/v1/qr-links creates link and returns response")
    void testCreateLink() throws Exception {
        QrLinkResponse response = QrLinkResponse.builder()
                .code("k8s9x2a")
                .shortUrl("https://acklet.dev/q/k8s9x2a")
                .manageToken("tok_1234567890abcdef")
                .expiresAt(Instant.now().plusSeconds(3600))
                .status("ACTIVE")
                .type("TEXT")
                .contentBytes(24L)
                .build();

        when(qrLinkService.createLink(any(CreateQrLinkRequest.class), any())).thenReturn(response);

        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload("Hello world QR code")
                .build();

        mockMvc.perform(post("/api/v1/qr-links")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("k8s9x2a"))
                .andExpect(jsonPath("$.data.manageToken").value("tok_1234567890abcdef"))
                .andExpect(jsonPath("$.data.shortUrl").value("https://acklet.dev/q/k8s9x2a"));
    }

    @Test
    @DisplayName("PUT /api/v1/qr-links/{code} passes manage token from header")
    void testUpdateLink() throws Exception {
        QrLinkResponse response = QrLinkResponse.builder()
                .code("k8s9x2a")
                .shortUrl("https://acklet.dev/q/k8s9x2a")
                .status("ACTIVE")
                .type("TEXT")
                .contentBytes(30L)
                .build();

        when(qrLinkService.updateLink(eq("k8s9x2a"), any(UpdateQrLinkRequest.class), eq("tok_test_header")))
                .thenReturn(response);

        UpdateQrLinkRequest request = UpdateQrLinkRequest.builder()
                .type("TEXT")
                .payload("Updated plain text note")
                .build();

        mockMvc.perform(put("/api/v1/qr-links/k8s9x2a")
                        .header("X-Manage-Token", "tok_test_header")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("k8s9x2a"));

        verify(qrLinkService).updateLink(eq("k8s9x2a"), any(UpdateQrLinkRequest.class), eq("tok_test_header"));
    }

    @Test
    @DisplayName("GET /api/v1/qr-links/{code}/stats retrieves scan stats")
    void testGetStats() throws Exception {
        QrLinkStatsDto stats = QrLinkStatsDto.builder()
                .code("k8s9x2a")
                .scanCount(15L)
                .status("ACTIVE")
                .preview("Meeting notes...")
                .type("TEXT")
                .build();

        when(qrLinkService.getStats(eq("k8s9x2a"), eq("tok_stats"))).thenReturn(stats);

        mockMvc.perform(get("/api/v1/qr-links/k8s9x2a/stats")
                        .header("X-Manage-Token", "tok_stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.scanCount").value(15))
                .andExpect(jsonPath("$.data.preview").value("Meeting notes..."));
    }

    @Test
    @DisplayName("POST /api/v1/qr-links/lookup performs batch summary lookup")
    void testLookup() throws Exception {
        QrLinkSummaryDto summary = QrLinkSummaryDto.builder()
                .code("k8s9x2a")
                .shortUrl("https://acklet.dev/q/k8s9x2a")
                .type("TEXT")
                .preview("Hello")
                .scanCount(3L)
                .status("ACTIVE")
                .build();

        when(qrLinkService.lookupSummaries(any(QrLinkLookupRequest.class))).thenReturn(List.of(summary));

        QrLinkLookupRequest lookupRequest = QrLinkLookupRequest.builder()
                .links(List.of(new QrLinkLookupItem("k8s9x2a", "tok_123")))
                .build();

        mockMvc.perform(post("/api/v1/qr-links/lookup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lookupRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("k8s9x2a"))
                .andExpect(jsonPath("$.data[0].scanCount").value(3));
    }
}
