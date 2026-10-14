package com.code.acklet.tool.tools.clipboard.controller;

import com.code.acklet.shared.dto.ApiResponse;
import com.code.acklet.tool.tools.clipboard.dto.*;
import com.code.acklet.tool.tools.clipboard.service.ClipboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/clipboard")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ClipboardController {

    private final ClipboardService clipboardService;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<ClipboardConfigDto>> getConfig() {
        ClipboardConfigDto config = clipboardService.getConfig();
        return ResponseEntity.ok(ApiResponse.success(config, "Clipboard config retrieved"));
    }

    @PostMapping("/shares")
    public ResponseEntity<ApiResponse<ClipboardShareDto>> createShare(@RequestBody(required = false) CreateShareRequest request) {
        ClipboardShareDto share = clipboardService.createShare(request);
        return ResponseEntity.ok(ApiResponse.success(share, "Clipboard share created"));
    }

    @GetMapping("/shares/{code}")
    public ResponseEntity<ApiResponse<ClipboardShareDto>> getShare(
            @PathVariable String code,
            @RequestParam(required = false) String pin) {
        return clipboardService.getShare(code, pin)
                .map(share -> ResponseEntity.ok(ApiResponse.success(share, "Clipboard share retrieved")))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.<ClipboardShareDto>builder()
                        .success(false)
                        .message("Clipboard not found or expired")
                        .build()));
    }

    @PostMapping("/shares/{code}/text")
    public ResponseEntity<ApiResponse<ClipboardItemDto>> addTextItem(
            @PathVariable String code,
            @RequestBody AddTextRequest request,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken,
            @RequestParam(value = "isEncrypted", defaultValue = "false") boolean isEncrypted) {
        String text = (request != null) ? request.getText() : "";
        ClipboardItemDto item = clipboardService.addTextItem(code, text, ownerToken, isEncrypted);
        return ResponseEntity.ok(ApiResponse.success(item, "Text saved successfully"));
    }

    @DeleteMapping("/shares/{code}/items/{itemId}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(
            @PathVariable String code,
            @PathVariable String itemId,
            @RequestHeader(value = "X-Owner-Token", required = false) String ownerToken) {
        boolean deleted = clipboardService.deleteItem(code, itemId, ownerToken);
        if (deleted) {
            return ResponseEntity.ok(ApiResponse.success(null, "Item deleted"));
        } else {
            return ResponseEntity.status(404).body(ApiResponse.<Void>builder()
                    .success(false)
                    .message("Item not found")
                    .build());
        }
    }
}
