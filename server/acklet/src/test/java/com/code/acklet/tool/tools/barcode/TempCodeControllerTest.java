package com.code.acklet.tool.tools.barcode;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.barcode.controller.TempCodeController;
import com.code.acklet.tool.tools.barcode.dto.TempCodeVerifyResponse;
import com.code.acklet.tool.tools.barcode.service.TempCodeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TempCodeControllerTest {

    @Mock
    private TempCodeService tempCodeService;

    @InjectMocks
    private TempCodeController controller;

    @Test
    @DisplayName("Verification endpoint must return Cache-Control: no-store and no-cache")
    void testVerifyEndpointCacheControlNoStore() {
        TempCodeVerifyResponse verifyResponse = TempCodeVerifyResponse.builder()
                .status("VALID")
                .expiresAt(Instant.now().plusSeconds(3600))
                .remainingSeconds(3600L)
                .contentType("MESSAGE")
                .content("Valid test message")
                .name("Temporary 1")
                .build();

        when(tempCodeService.verifyCode(eq("test_token_123"), anyString()))
                .thenReturn(verifyResponse);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        ResponseEntity<ApiResponse<TempCodeVerifyResponse>> response = controller.verifyCode("test_token_123", request);

        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());

        // Check strict Cache-Control: no-store
        String cacheControl = response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL);
        assertNotNull(cacheControl);
        assertTrue(cacheControl.contains("no-store"), "Verification response MUST contain Cache-Control: no-store");
        assertTrue(cacheControl.contains("no-cache"));

        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals("VALID", response.getBody().getData().getStatus());
        assertEquals("Valid test message", response.getBody().getData().getContent());
    }
}

