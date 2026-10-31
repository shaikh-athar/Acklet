package com.code.acklet.tool.tools.shortener.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.shortener.dto.*;
import com.code.acklet.tool.tools.shortener.service.ShortLinkService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/short-links")
@RequiredArgsConstructor
@Slf4j
public class ShortLinkController {

    private final ShortLinkService shortLinkService;

    @PostMapping
    public ResponseEntity<ApiResponse<ShortLinkResponse>> createLink(
            @Valid @RequestBody CreateShortLinkRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        ShortLinkResponse response = shortLinkService.createLink(request, ownerTokenHeader, clientIp);
        HttpHeaders headers = createSecureHeaders();
        if (response.getOwnerToken() != null) {
            headers.set("X-Owner-Token", response.getOwnerToken());
        }
        return ResponseEntity.ok()
                .headers(headers)
                .body(ApiResponse.success(response, "Short link created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ShortLinkListResponse>> listLinks(
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        ShortLinkListResponse response = shortLinkService.listOwnerLinks(ownerTokenHeader, search, status, page, size);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Links retrieved successfully"));
    }

    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<ShortLinkAvailabilityResponse>> checkAvailability(
            @RequestParam String code,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        ShortLinkAvailabilityResponse response = shortLinkService.checkAvailability(code, clientIp);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, response.isAvailable() ? "Available" : "Unavailable"));
    }

    @PostMapping("/lookup")
    public ResponseEntity<ApiResponse<List<ShortLinkItemDto>>> lookupLinks(
            @RequestBody ShortLinkLookupRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        List<ShortLinkItemDto> items = shortLinkService.lookupLinks(request, clientIp);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(items, "Lookup completed"));
    }

    @PostMapping("/migrate")
    public ResponseEntity<ApiResponse<ShortLinkMigrateResponse>> migrateLinks(
            @RequestBody ShortLinkMigrateRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        ShortLinkMigrateResponse response = shortLinkService.migrateLinks(request, clientIp);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Migration completed successfully"));
    }

    @GetMapping("/preview/{code}")
    public ResponseEntity<ApiResponse<ShortLinkPreviewResponse>> getPreview(
            @PathVariable String code,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        ShortLinkPreviewResponse response = shortLinkService.getPreview(code, clientIp);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Preview metadata retrieved"));
    }

    @GetMapping("/{code}")
    public ResponseEntity<ApiResponse<ShortLinkResponse>> getLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        ShortLinkResponse response = shortLinkService.getLink(code, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Link details retrieved"));
    }

    @RequestMapping(value = "/{code}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<ShortLinkResponse>> updateLink(
            @PathVariable String code,
            @Valid @RequestBody UpdateShortLinkRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        ShortLinkResponse response = shortLinkService.updateLink(code, request, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Link updated successfully"));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<ApiResponse<Void>> deleteLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        shortLinkService.deleteLink(code, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(null, "Link deleted successfully"));
    }

    @PostMapping("/{code}/deactivate")
    public ResponseEntity<ApiResponse<ShortLinkResponse>> deactivateLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        ShortLinkResponse response = shortLinkService.deactivateLink(code, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Link deactivated"));
    }

    @PostMapping("/{code}/reactivate")
    public ResponseEntity<ApiResponse<ShortLinkResponse>> reactivateLink(
            @PathVariable String code,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        ShortLinkResponse response = shortLinkService.reactivateLink(code, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(response, "Link reactivated"));
    }

    @PostMapping("/{code}/report")
    public ResponseEntity<ApiResponse<Void>> reportLink(
            @PathVariable String code,
            @Valid @RequestBody ReportLinkRequest request,
            HttpServletRequest servletRequest) {
        String clientIp = extractClientIp(servletRequest);
        shortLinkService.reportLink(code, request, clientIp);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(null, "Thank you. Report received for safety review."));
    }

    @GetMapping("/{code}/stats")
    public ResponseEntity<ApiResponse<ShortLinkStatsResponse>> getLinkStats(
            @PathVariable String code,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        ShortLinkStatsResponse stats = shortLinkService.getLinkStats(code, ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(stats, "Stats retrieved successfully"));
    }

    @PostMapping("/bulk/deactivate")
    public ResponseEntity<ApiResponse<Integer>> bulkDeactivate(
            @Valid @RequestBody BulkActionRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        int count = shortLinkService.bulkDeactivate(request.getCodes(), ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(count, count + " links deactivated"));
    }

    @PostMapping("/bulk/reactivate")
    public ResponseEntity<ApiResponse<Integer>> bulkReactivate(
            @Valid @RequestBody BulkActionRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        int count = shortLinkService.bulkReactivate(request.getCodes(), ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(count, count + " links reactivated"));
    }

    @PostMapping("/bulk/delete")
    public ResponseEntity<ApiResponse<Integer>> bulkDelete(
            @Valid @RequestBody BulkActionRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        int count = shortLinkService.bulkDelete(request.getCodes(), ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(count, count + " links deleted"));
    }

    @PostMapping("/bulk/restore")
    public ResponseEntity<ApiResponse<Integer>> bulkRestore(
            @Valid @RequestBody BulkActionRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerTokenHeader) {
        int count = shortLinkService.bulkRestore(request.getCodes(), ownerTokenHeader);
        return ResponseEntity.ok()
                .headers(createSecureHeaders())
                .body(ApiResponse.success(count, count + " links restored"));
    }

    private HttpHeaders createSecureHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setCacheControl("no-cache, no-store, max-age=0, must-revalidate");
        headers.setPragma("no-cache");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("X-Frame-Options", "DENY");
        return headers;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
