package com.code.acklet.tool.tools.qr.controller;

import com.code.acklet.tool.tools.qr.service.QrResolutionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@Slf4j
public class QrRedirectController {

    private final QrResolutionService resolutionService;

    @GetMapping("/q/{code}")
    public ResponseEntity<?> resolve(@PathVariable String code, HttpServletRequest request) {
        return resolutionService.resolveShortlink(code, request);
    }

    @GetMapping({"/qr", "/qr/**"})
    public ResponseEntity<Void> redirectToQrTool() {
        return ResponseEntity.status(org.springframework.http.HttpStatus.FOUND)
                .header(org.springframework.http.HttpHeaders.LOCATION, "/tools/qr-generator")
                .build();
    }
}
