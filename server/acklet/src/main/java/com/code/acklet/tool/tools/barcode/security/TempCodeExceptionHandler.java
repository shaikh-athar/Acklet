package com.code.acklet.tool.tools.barcode.security;

import com.code.acklet.shared.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@RestControllerAdvice(basePackages = "com.code.acklet.tool.tools.barcode")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TempCodeExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[TempCodeError] status={}, reason={}, requestId={}", ex.getStatusCode(), ex.getReason(), requestId);

        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;

        String message = ex.getReason();
        if (message == null || message.isBlank()) {
            if (status == HttpStatus.NOT_FOUND) {
                message = TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.NOT_FOUND);
            } else if (status == HttpStatus.TOO_MANY_REQUESTS) {
                message = TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.RATE_LIMITED);
            } else if (status == HttpStatus.FORBIDDEN || status == HttpStatus.UNAUTHORIZED) {
                message = TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.NO_PERMISSION);
            } else {
                message = TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.SERVER_ERROR);
            }
        }

        return ResponseEntity.status(status).body(ApiResponse.error(message, requestId));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[TempCodeValidation] msg={}, requestId={}", ex.getMessage(), requestId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage(), requestId));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        String firstError = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getDefaultMessage())
                .filter(m -> m != null && !m.isBlank())
                .findFirst()
                .orElse("Validation failed");

        log.warn("[TempCodeValidation] methodArgumentNotValid={}, requestId={}", firstError, requestId);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(firstError, requestId));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        String firstError = ex.getConstraintViolations().stream()
                .map(v -> v.getMessage())
                .findFirst()
                .orElse("Validation constraint violated");

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(firstError, requestId));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneralException(Exception ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.error("[TempCodeFatal] Unexpected error occurred, requestId={}", requestId, ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(TempCodeMessageCatalog.getFriendlyMessage(TempCodeMessageCatalog.SERVER_ERROR), requestId));
    }

    private String resolveRequestId(HttpServletRequest request) {
        if (request == null) return UUID.randomUUID().toString().substring(0, 8);
        String header = request.getHeader("X-Request-Id");
        if (header != null && !header.isBlank()) return header.trim();
        return UUID.randomUUID().toString().substring(0, 8);
    }
}

