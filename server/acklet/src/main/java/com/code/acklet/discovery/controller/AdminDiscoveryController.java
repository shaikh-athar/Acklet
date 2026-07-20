package com.code.acklet.discovery.controller;

import com.code.acklet.discovery.entity.DiscoveryRankingWeight;
import com.code.acklet.discovery.entity.HomepageSectionConfig;
import com.code.acklet.discovery.repository.DiscoveryRankingWeightRepository;
import com.code.acklet.discovery.repository.HomepageSectionConfigRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/discovery")
@RequiredArgsConstructor
@Tag(name = "Admin Discovery Control", description = "Admin endpoints for dynamic homepage sections and ranking weights")
public class AdminDiscoveryController {

    private final HomepageSectionConfigRepository sectionConfigRepository;
    private final DiscoveryRankingWeightRepository rankingWeightRepository;

    @GetMapping("/homepage-sections")
    @Operation(summary = "Get all homepage section configurations")
    public ResponseEntity<List<HomepageSectionConfig>> getHomepageSections() {
        return ResponseEntity.ok(sectionConfigRepository.findAll());
    }

    @PutMapping("/homepage-sections")
    @Operation(summary = "Save or update homepage section configuration")
    public ResponseEntity<HomepageSectionConfig> updateHomepageSection(@RequestBody HomepageSectionConfig config) {
        return ResponseEntity.ok(sectionConfigRepository.save(config));
    }

    @GetMapping("/ranking-weights")
    @Operation(summary = "Get current discovery ranking weights")
    public ResponseEntity<DiscoveryRankingWeight> getRankingWeights() {
        return ResponseEntity.ok(rankingWeightRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> rankingWeightRepository.save(DiscoveryRankingWeight.builder().build())));
    }

    @PutMapping("/ranking-weights")
    @Operation(summary = "Update discovery ranking weights")
    public ResponseEntity<DiscoveryRankingWeight> updateRankingWeights(@RequestBody DiscoveryRankingWeight weights) {
        return ResponseEntity.ok(rankingWeightRepository.save(weights));
    }
}
