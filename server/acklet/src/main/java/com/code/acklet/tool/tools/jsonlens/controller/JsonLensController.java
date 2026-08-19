package com.code.acklet.tool.tools.jsonlens.controller;

import com.code.acklet.tool.tools.jsonlens.dto.JsonLensRequest;
import com.code.acklet.tool.tools.jsonlens.dto.JsonLensResponse;
import com.code.acklet.tool.tools.jsonlens.service.JsonLensService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tools/json-lens")
@CrossOrigin(origins = "*")
public class JsonLensController {

    private final JsonLensService jsonLensService;

    public JsonLensController(JsonLensService jsonLensService) {
        this.jsonLensService = jsonLensService;
    }

    @PostMapping("/format")
    public ResponseEntity<JsonLensResponse> formatJson(@RequestBody JsonLensRequest request) {
        JsonLensResponse response = jsonLensService.formatJson(request);
        return ResponseEntity.ok(response);
    }
}
