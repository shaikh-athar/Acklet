package com.code.acklet.airvault.controller;

import com.code.acklet.airvault.service.AirVaultHistoryService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/airvault/history")
@RequiredArgsConstructor
@Tag(name = "AirVault Day-Grouped History & Audit Trail", description = "Cache-aside per-day history endpoints for audit logs, resource history, and text clipboard history")
public class AirVaultHistoryController {

    private final AirVaultHistoryService historyService;

    @GetMapping("/{type}")
    @Operation(summary = "Get Single-Day History", description = "Returns records for a specific date (or 'today') with Redis cache-aside (1h TTL)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDayHistory(
            @PathVariable String type,
            @RequestParam(required = false, defaultValue = "today") String date,
            @RequestParam(required = false) String clientDeviceId,
            @RequestParam(required = false) String username) {

        List<Map<String, Object>> entries = historyService.getDayHistory(type, clientDeviceId, username, date);
        return ResponseEntity.ok(ApiResponse.success(entries, "Day history retrieved"));
    }

    @GetMapping("/search")
    @Operation(summary = "Search Across History & Resources", description = "Context-aware and word-boundary full text search across clipboard entries, text snippets, and resource files with snippet offsets and match counts")
    public ResponseEntity<ApiResponse<com.code.acklet.airvault.dto.AirVaultSearchDtos.SearchResponse>> searchHistory(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "7") Integer windowDays,
            @RequestParam(required = false, defaultValue = "false") Boolean fullRange,
            @RequestParam(required = false) String clientDeviceId,
            @RequestParam(required = false) String username) {

        com.code.acklet.airvault.dto.AirVaultSearchDtos.SearchResponse response = historyService.searchUnifiedHistory(
                query, clientDeviceId, username, windowDays, fullRange);
        return ResponseEntity.ok(ApiResponse.success(response, "Search results retrieved"));
    }
}
