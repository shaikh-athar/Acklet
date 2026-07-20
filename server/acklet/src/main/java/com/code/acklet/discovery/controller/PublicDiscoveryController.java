package com.code.acklet.discovery.controller;

import com.code.acklet.discovery.service.DiscoverySearchService;
import com.code.acklet.discovery.service.HomepageDiscoveryService;
import com.code.acklet.discovery.service.RecommendationService;
import com.code.acklet.tool.entity.Tool;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/discovery")
@RequiredArgsConstructor
@Tag(name = "Intelligent Discovery Engine", description = "Endpoints for specification-driven search, autocomplete, dynamic homepage sections, and tool recommendations")
public class PublicDiscoveryController {

    private final DiscoverySearchService searchService;
    private final HomepageDiscoveryService homepageDiscoveryService;
    private final RecommendationService recommendationService;

    @GetMapping("/search")
    @Operation(summary = "Search tools with dynamic specifications, ranking, and synonyms")
    public ResponseEntity<Page<Tool>> search(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(searchService.searchTools(query, category, PageRequest.of(page, size)));
    }

    @GetMapping("/search/autocomplete")
    @Operation(summary = "Get instant search autocomplete suggestions")
    public ResponseEntity<List<String>> autocomplete(@RequestParam String q) {
        return ResponseEntity.ok(searchService.autocomplete(q));
    }

    @GetMapping("/homepage")
    @Operation(summary = "Get dynamic configuration-driven homepage discovery sections")
    public ResponseEntity<List<HomepageDiscoveryService.DynamicHomepageSectionDto>> getHomepageSections() {
        return ResponseEntity.ok(homepageDiscoveryService.getHomepageDiscoverySections());
    }

    @GetMapping("/tools/{id}/recommendations")
    @Operation(summary = "Get tool recommendations and alternative tools")
    public ResponseEntity<List<Tool>> getRecommendations(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "ALTERNATIVE") String type
    ) {
        return ResponseEntity.ok(recommendationService.getRecommendations(id, type));
    }
}
