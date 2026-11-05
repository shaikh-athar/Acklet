package com.code.acklet.tool.tools.shortener.controller;

import com.code.acklet.tool.tools.shortener.service.ShortRedirectService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ShortRedirectController {

    private final ShortRedirectService redirectService;

    @GetMapping("/s/{code}")
    public ResponseEntity<?> resolve(
            @PathVariable String code,
            HttpServletRequest request) {
        log.info("[ShortRedirectController] GET /s/{} - incoming short link request from ip={}, userAgent='{}'",
                code, request.getRemoteAddr(), request.getHeader("User-Agent"));
        return redirectService.resolveAndRedirect(code, request);
    }

    @PostMapping("/s/{code}/unlock")
    public ResponseEntity<?> unlock(
            @PathVariable String code,
            @RequestParam("password") String password,
            HttpServletRequest request,
            HttpServletResponse response) {
        log.info("[ShortRedirectController] POST /s/{}/unlock - password unlock attempt from ip={}",
                code, request.getRemoteAddr());
        return redirectService.handleUnlockPost(code, password, request, response);
    }
}
