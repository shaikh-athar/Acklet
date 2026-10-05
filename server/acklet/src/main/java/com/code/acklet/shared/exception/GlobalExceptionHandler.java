package com.code.acklet.shared.exception;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.shared.logging.CorrelationIdFilter;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    private String getTraceId() {
        String traceId = MDC.get(CorrelationIdFilter.CORRELATION_MDC_KEY);
        return traceId != null ? traceId : "N/A";
    }

    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ApiResponse<Void>> handleBaseException(BaseException ex) {
        log.warn("Business exception occurred [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage(), getTraceId());
        return new ResponseEntity<>(response, ex.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationException(MethodArgumentNotValidException ex) {
        log.warn("Validation failed [traceId={}]: {} errors -> {} ", getTraceId(), ex.getBindingResult().getErrorCount(),ex.getMessage());
        
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ApiResponse<Map<String, String>> response = ApiResponse.error("Validation failed", getTraceId(), errors);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException ex) {
        log.warn("Access denied [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error("Access denied: Insufficient privileges", getTraceId());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentialsException(BadCredentialsException ex) {
        log.warn("Bad credentials [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error("Invalid username or password", getTraceId());
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException ex) {
        log.warn("Authentication failed [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error("Authentication failed", getTraceId());
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler({
            org.apache.catalina.connector.ClientAbortException.class,
            org.springframework.web.context.request.async.AsyncRequestNotUsableException.class
    })
    public void handleClientAbortException(Exception ex) {
        log.debug("[GlobalExceptionHandler] 🔌 Client disconnected or aborted stream connection [traceId={}]: {}",
                getTraceId(), ex.getMessage());
    }

    @ExceptionHandler(java.io.IOException.class)
    public ResponseEntity<ApiResponse<Void>> handleIOException(java.io.IOException ex, jakarta.servlet.http.HttpServletResponse response) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (msg.contains("broken pipe") || msg.contains("connection reset") || msg.contains("connection closed") || msg.contains("aborted")) {
            log.debug("[GlobalExceptionHandler] 🔌 Client socket closed during transfer [traceId={}]: {}", getTraceId(), ex.getMessage());
            return null;
        }

        if (response.isCommitted()) {
            log.warn("[GlobalExceptionHandler] ⚠️ IOException occurred after response was committed [traceId={}]: {}", getTraceId(), ex.getMessage());
            return null;
        }

        log.error("IO exception caught [traceId={}]: ", getTraceId(), ex);
        ApiResponse<Void> apiResponse = ApiResponse.error("An IO error occurred while processing the request.", getTraceId());
        return new ResponseEntity<>(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAllUncaughtException(Exception ex, jakarta.servlet.http.HttpServletResponse response) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (msg.contains("broken pipe") || msg.contains("connection reset") || msg.contains("clientabort") || msg.contains("asyncnotusable")) {
            log.debug("[GlobalExceptionHandler] 🔌 Client disconnected mid-transfer [traceId={}]: {}", getTraceId(), ex.getMessage());
            return null;
        }

        if (response.isCommitted()) {
            log.warn("[GlobalExceptionHandler] ⚠️ Uncaught exception occurred on already-committed response [traceId={}]: {}",
                    getTraceId(), ex.getMessage());
            return null;
        }

        log.error("Unhandled exception caught [traceId={}]: ", getTraceId(), ex);
        ApiResponse<Void> apiResponse = ApiResponse.error("An unexpected error occurred. Please contact support.", getTraceId());
        return new ResponseEntity<>(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
