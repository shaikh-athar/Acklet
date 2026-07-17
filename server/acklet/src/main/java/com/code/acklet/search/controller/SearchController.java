package com.code.acklet.search.controller;

import com.code.acklet.search.service.SearchService;
import com.code.acklet.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Endpoints for autocomplete and search suggestions")
public class SearchController {

    private final SearchService searchService;

    @GetMapping("/autocomplete")
    @Operation(summary = "Get autocomplete suggestions", description = "Retrieves top 5 tool name suggestions matching search prefix")
    public ResponseEntity<ApiResponse<List<String>>> autocomplete(@RequestParam("q") String query) {
        List<String> suggestions = searchService.getAutocompleteSuggestions(query);
        return ResponseEntity.ok(ApiResponse.success(suggestions, "Suggestions retrieved successfully"));
    }
}
