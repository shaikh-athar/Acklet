package com.code.acklet.tool.tools.shortener;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.shortener.security.ShortenerExceptionHandler;
import com.code.acklet.tool.tools.shortener.security.ShortenerMessageCatalog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;

class ShortenerExceptionHandlerTest {

    private ShortenerExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new ShortenerExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/short-links/create");
    }

    @Test
    @DisplayName("ResponseStatusException maps to catalog message and hides raw technical detail")
    void testResponseStatusExceptionHandling() {
        ResponseStatusException ex = new ResponseStatusException(HttpStatus.NOT_FOUND, "Entity sle1_0 with id 42 not found");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleResponseStatus(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo(ShortenerMessageCatalog.getMessage(ShortenerMessageCatalog.LINK_UNAVAILABLE));
        // Ensure no internal entity names or SQL fragments leak
        assertThat(response.getBody().getMessage()).doesNotContain("sle1_0").doesNotContain("id 42");
    }

    @Test
    @DisplayName("Unhandled Exception maps to calm SERVER_ERROR message without stack trace or SQL leaks")
    void testGeneralExceptionHandling() {
        RuntimeException ex = new RuntimeException("org.postgresql.util.PSQLException: column sle1_0.target_host does not exist");
        ResponseEntity<ApiResponse<Void>> response = exceptionHandler.handleGenericException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
        assertThat(response.getBody().getMessage()).isEqualTo(ShortenerMessageCatalog.getMessage(ShortenerMessageCatalog.SERVER_ERROR));
        assertThat(response.getBody().getMessage()).doesNotContain("PSQLException").doesNotContain("target_host");
        assertThat(response.getHeaders().getFirst("X-Request-Id")).isNotBlank();
    }
}
