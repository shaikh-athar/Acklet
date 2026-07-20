package com.code.acklet.tool.controller;

import com.code.acklet.tool.dto.ToolKnowledgeResponseDto;
import com.code.acklet.tool.service.ToolKnowledgeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tools")
@RequiredArgsConstructor
@Tag(name = "Tool Knowledge Hubs", description = "Public endpoints explaining tool technical parameters, release version history, and privacy/local-execution audits")
public class PublicToolKnowledgeController {

    private final ToolKnowledgeService knowledgeService;

    @GetMapping("/{id}/knowledge")
    @Operation(summary = "Get detailed profile and compatibility metrics by Tool UUID")
    public ResponseEntity<ToolKnowledgeResponseDto> getToolKnowledge(@PathVariable UUID id) {
        return ResponseEntity.ok(knowledgeService.getToolKnowledge(id));
    }
}
