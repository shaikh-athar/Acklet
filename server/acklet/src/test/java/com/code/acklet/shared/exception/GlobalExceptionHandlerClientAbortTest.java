package com.code.acklet.shared.exception;

import com.code.acklet.shared.dto.ApiResponse;
import org.apache.catalina.connector.ClientAbortException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerClientAbortTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletResponse mockResponse;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        mockResponse = new MockHttpServletResponse();
    }

    @Test
    void testClientAbortExceptionShortCircuitsWithoutWritingBody() throws Exception {
        ClientAbortException ex = new ClientAbortException(new IOException("Broken pipe"));
        
        // Should not throw or fail, and does not return a body
        exceptionHandler.handleClientAbortException(ex);
        assertThat(mockResponse.getContentAsString()).isEmpty();
    }

    @Test
    void testAsyncRequestNotUsableExceptionShortCircuitsWithoutWritingBody() throws Exception {
        AsyncRequestNotUsableException ex = new AsyncRequestNotUsableException("ServletOutputStream failed to write");
        
        exceptionHandler.handleClientAbortException(ex);
        assertThat(mockResponse.getContentAsString()).isEmpty();
    }

    @Test
    void testBrokenPipeIOExceptionReturnsNullAndDoesNotWriteBody() throws Exception {
        IOException ex = new IOException("Broken pipe");
        
        ResponseEntity<ApiResponse<Void>> result = exceptionHandler.handleIOException(ex, mockResponse);
        assertThat(result).isNull();
        assertThat(mockResponse.getContentAsString()).isEmpty();
    }

    @Test
    void testConnectionResetIOExceptionReturnsNullAndDoesNotWriteBody() throws Exception {
        IOException ex = new IOException("Connection reset by peer");
        
        ResponseEntity<ApiResponse<Void>> result = exceptionHandler.handleIOException(ex, mockResponse);
        assertThat(result).isNull();
        assertThat(mockResponse.getContentAsString()).isEmpty();
    }

    @Test
    void testCommittedResponseDoesNotWriteErrorBody() throws Exception {
        mockResponse.setCommitted(true);
        Exception ex = new RuntimeException("Late exception on committed stream");
        
        ResponseEntity<ApiResponse<Void>> result = exceptionHandler.handleAllUncaughtException(ex, mockResponse);
        assertThat(result).isNull();
        assertThat(mockResponse.getContentAsString()).isEmpty();
    }

    @Test
    void testNormalUncaughtExceptionOnUncommittedResponseReturns500() throws Exception {
        mockResponse.setCommitted(false);
        Exception ex = new RuntimeException("Standard business exception");
        
        ResponseEntity<ApiResponse<Void>> result = exceptionHandler.handleAllUncaughtException(ex, mockResponse);
        assertThat(result).isNotNull();
        assertThat(result.getStatusCode().value()).isEqualTo(500);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().isSuccess()).isFalse();
    }
}
