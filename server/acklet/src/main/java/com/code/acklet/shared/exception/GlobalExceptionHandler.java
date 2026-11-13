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

import jakarta.servlet.http.HttpServletResponse;
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
        log.warn("Validation failed [traceId={}]: {} errors", getTraceId(), ex.getBindingResult().getErrorCount());
        
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

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalStateException(IllegalStateException ex) {
        log.warn("Conflict/State exception [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage(), getTraceId());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument exception [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage(), getTraceId());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ApiResponse<Void>> handleSecurityException(SecurityException ex) {
        log.warn("Security exception [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error(ex.getMessage(), getTraceId());
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailureException(org.springframework.dao.OptimisticLockingFailureException ex) {
        log.warn("Optimistic locking conflict [traceId={}]: {}", getTraceId(), ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error("Conflict: The clipboard was updated by another session. Please reload to see the latest version.", getTraceId());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.UnsupportedFormatException.class)
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> handleUnsupportedFormat(com.code.acklet.converter.exception.UnsupportedFormatException ex) {
        log.warn("Unsupported conversion format [traceId={}]: {}", getTraceId(), ex.getMessage());
        java.util.Map<String, Object> data = (ex.getSupportedTargets() != null && !ex.getSupportedTargets().isEmpty())
                ? java.util.Map.of("supportedTargets", ex.getSupportedTargets())
                : null;
        ApiResponse<java.util.Map<String, Object>> body = ApiResponse.<java.util.Map<String, Object>>builder()
                .success(false)
                .code("UNSUPPORTED_PAIR")
                .message(ex.getUserMessage())
                .fileId(ex.getFileId())
                .data(data)
                .traceId(getTraceId())
                .timestamp(java.time.Instant.now())
                .build();
        return new ResponseEntity<>(body, HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.InvalidFileException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidFile(com.code.acklet.converter.exception.InvalidFileException ex) {
        log.warn("Invalid file upload for conversion [traceId={}]: {}", getTraceId(), ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("INVALID_FILE", ex.getMessage(), null, getTraceId()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.JobNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleJobNotFound(com.code.acklet.converter.exception.JobNotFoundException ex) {
        log.warn("Conversion job not found [traceId={}]: {}", getTraceId(), ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("JOB_NOT_FOUND", ex.getMessage(), null, getTraceId()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.QueueUnavailableException.class)
    public ResponseEntity<ApiResponse<Void>> handleQueueUnavailable(com.code.acklet.converter.exception.QueueUnavailableException ex) {
        log.warn("Conversion queue unavailable [traceId={}]: {}", getTraceId(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header("Retry-After", "30")
                .body(ApiResponse.error("QUEUE_UNAVAILABLE", ex.getMessage(), null, getTraceId()));
    }

    @ExceptionHandler(com.code.acklet.converter.exception.EngineUnavailableException.class)
    public ResponseEntity<ApiResponse<Void>> handleEngineUnavailable(com.code.acklet.converter.exception.EngineUnavailableException ex) {
        log.error("Conversion engine unavailable [traceId={}]: {}", getTraceId(), ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("ENGINE_UNAVAILABLE", "Document conversion engine is warming up or unavailable. Please try again shortly.", null, getTraceId()), HttpStatus.SERVICE_UNAVAILABLE);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.ConversionTimeoutException.class)
    public ResponseEntity<ApiResponse<Void>> handleConversionTimeout(com.code.acklet.converter.exception.ConversionTimeoutException ex) {
        log.error("Conversion timed out [traceId={}]: {}", getTraceId(), ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("TIMEOUT", "Document conversion timed out. Please try converting a smaller document.", null, getTraceId()), HttpStatus.GATEWAY_TIMEOUT);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.ConversionFailedException.class)
    public ResponseEntity<ApiResponse<Void>> handleConversionFailed(com.code.acklet.converter.exception.ConversionFailedException ex) {
        log.error("Conversion failed [traceId={}]: {}", getTraceId(), ex.getMessage());
        return new ResponseEntity<>(ApiResponse.error("CONVERSION_FAILED", "Document could not be converted. Please ensure it is not password-protected or corrupted.", null, getTraceId()), HttpStatus.UNPROCESSABLE_ENTITY);
    }

    @ExceptionHandler(com.code.acklet.converter.exception.ConversionException.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericConversion(com.code.acklet.converter.exception.ConversionException ex) {
        log.error("Conversion exception [traceId={}]: {}", getTraceId(), ex.getMessage());
        String code = "CONVERSION_ERROR";
        String msg = ex.getMessage();
        if (msg != null && msg.contains(": ")) {
            String prefix = msg.substring(0, msg.indexOf(": ")).trim();
            if (prefix.matches("^[A-Z_]+$")) {
                code = prefix;
                msg = msg.substring(msg.indexOf(": ") + 2).trim();
            }
        }
        return new ResponseEntity<>(ApiResponse.error(code, msg, null, getTraceId()), HttpStatus.INTERNAL_SERVER_ERROR);
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
    public ResponseEntity<ApiResponse<Void>> handleIOException(java.io.IOException ex, HttpServletResponse response) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (msg.contains("broken pipe") || msg.contains("connection reset") || msg.contains("connection closed") || msg.contains("aborted")) {
            log.debug("[GlobalExceptionHandler] 🔌 Client socket closed during transfer [traceId={}]: {}", getTraceId(), ex.getMessage());
            return null;
        }

        if (response != null && response.isCommitted()) {
            log.warn("[GlobalExceptionHandler] ⚠️ IOException occurred after response was committed [traceId={}]: {}", getTraceId(), ex.getMessage());
            return null;
        }

        log.error("IO exception caught [traceId={}]: ", getTraceId(), ex);
        ApiResponse<Void> apiResponse = ApiResponse.error("An IO error occurred while processing the request.", getTraceId());
        return new ResponseEntity<>(apiResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAllUncaughtException(Exception ex, HttpServletResponse response) {
        String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
        if (msg.contains("broken pipe") || msg.contains("connection reset") || msg.contains("clientabort") || msg.contains("asyncnotusable")) {
            log.debug("[GlobalExceptionHandler] 🔌 Client disconnected mid-transfer [traceId={}]: {}", getTraceId(), ex.getMessage());
            return null;
        }

        if (response != null && response.isCommitted()) {
            log.warn("[GlobalExceptionHandler] ⚠️ Uncaught exception occurred on already-committed response [traceId={}]: {}",
                    getTraceId(), ex.getMessage());
            return null;
        }

        log.error("Unhandled exception caught [traceId={}]:", getTraceId(), ex);
        ApiResponse<Void> responseBody = ApiResponse.error("An unexpected error occurred. Please contact support.", getTraceId());
        return new ResponseEntity<>(responseBody, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    public ResponseEntity<ApiResponse<Void>> handleAllUncaughtException(Exception ex) {
        return handleAllUncaughtException(ex, null);
    }
}
