package com.code.acklet.tool.tools.shortener.security;

import com.code.acklet.shared.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Controller advice scoped exclusively to the URL Shortener package.
 * Intercepts all exceptions from shortener endpoints and ensures NO raw system,
 * SQL, constraint, or library errors can leak into response bodies.
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.code.acklet.tool.tools.shortener")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ShortenerExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiResponse<Void>> handleResponseStatus(ResponseStatusException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[ShortenerError] status={}, reason={}, requestId={}", ex.getStatusCode(), ex.getReason(), requestId);

        String code = ShortenerMessageCatalog.SERVER_ERROR;
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;

        if (status == HttpStatus.NOT_FOUND || status == HttpStatus.GONE) {
            code = ShortenerMessageCatalog.LINK_UNAVAILABLE;
        } else if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
            code = ShortenerMessageCatalog.NO_PERMISSION;
        } else if (status == HttpStatus.TOO_MANY_REQUESTS) {
            code = ShortenerMessageCatalog.RATE_LIMITED;
        } else if (status == HttpStatus.BAD_REQUEST) {
            String reason = ex.getReason() != null ? ex.getReason().toLowerCase() : "";
            if (reason.contains("password")) {
                code = ShortenerMessageCatalog.PASSWORD_WRONG;
            } else if (reason.contains("name") || reason.contains("alias") || reason.contains("code")) {
                code = ShortenerMessageCatalog.NAME_TAKEN;
            } else {
                code = ShortenerMessageCatalog.LINK_INVALID;
            }
        }

        return buildSafeResponse(code, status, requestId);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[ShortenerError] validation failure: {}, requestId={}", ex.getMessage(), requestId);

        String code = ShortenerMessageCatalog.LINK_INVALID;
        String field = ex.getBindingResult().getFieldError() != null ? ex.getBindingResult().getFieldError().getField() : "";
        if ("code".equalsIgnoreCase(field) || "customAlias".equalsIgnoreCase(field)) {
            code = ShortenerMessageCatalog.NAME_INVALID;
        } else if ("password".equalsIgnoreCase(field)) {
            code = ShortenerMessageCatalog.PASSWORD_TOO_SHORT;
        }

        return buildSafeResponse(code, HttpStatus.BAD_REQUEST, requestId);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[ShortenerError] constraint violation, requestId={}", requestId);
        return buildSafeResponse(ShortenerMessageCatalog.LINK_INVALID, HttpStatus.BAD_REQUEST, requestId);
    }

    @ExceptionHandler({
            HttpMessageNotReadableException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleMalformedRequest(Exception ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[ShortenerError] malformed request: {}, requestId={}", ex.getMessage(), requestId);
        return buildSafeResponse(ShortenerMessageCatalog.LINK_INVALID, HttpStatus.BAD_REQUEST, requestId);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.warn("[ShortenerError] method not allowed, requestId={}", requestId);
        return buildSafeResponse(ShortenerMessageCatalog.SERVER_ERROR, HttpStatus.METHOD_NOT_ALLOWED, requestId);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        return buildSafeResponse(ShortenerMessageCatalog.SERVER_ERROR, HttpStatus.UNSUPPORTED_MEDIA_TYPE, requestId);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadLimit(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        return buildSafeResponse(ShortenerMessageCatalog.BACKUP_FILE_INVALID, HttpStatus.PAYLOAD_TOO_LARGE, requestId);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex, HttpServletRequest request) {
        String requestId = resolveRequestId(request);
        log.error("[ShortenerError] Uncaught exception [requestId={}]: ", requestId, ex);
        return buildSafeResponse(ShortenerMessageCatalog.SERVER_ERROR, HttpStatus.INTERNAL_SERVER_ERROR, requestId);
    }

    private ResponseEntity<ApiResponse<Void>> buildSafeResponse(String code, HttpStatus status, String requestId) {
        String friendlyMessage = ShortenerMessageCatalog.getMessage(code);
        ApiResponse<Void> body = ApiResponse.<Void>builder()
                .success(false)
                .message(friendlyMessage)
                .data(null)
                .meta(null)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Request-Id", requestId);
        headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");

        return new ResponseEntity<>(body, headers, status);
    }

    private String resolveRequestId(HttpServletRequest request) {
        String rid = request.getHeader("X-Correlation-ID");
        if (rid == null || rid.isBlank()) {
            rid = request.getHeader("X-Request-Id");
        }
        if (rid == null || rid.isBlank()) {
            rid = UUID.randomUUID().toString();
        }
        return rid;
    }
}

