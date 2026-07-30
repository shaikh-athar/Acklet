package com.code.acklet.shared.security;

import com.code.acklet.config.properties.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitingService rateLimitingService;
    private final AppProperties appProperties;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // Rate limiting is disabled for testing/development
        filterChain.doFilter(request, response);
        if (true) return;

        String path = request.getRequestURI();
        String method = request.getMethod();
        String clientIp = getClientIp(request);

        String rateKey = null;
        int maxRequests = 100;
        int windowSeconds = 60;

        if (path.startsWith("/api/v1/auth/google")) {
            rateKey = "auth_google:" + clientIp;
            maxRequests = 5;
            windowSeconds = 60;
        } else if (path.equals("/api/v1/auth/refresh")) {
            rateKey = "auth_refresh:" + clientIp;
            maxRequests = 30;
            windowSeconds = 60;
        } else if (path.contains("/search")) {
            rateKey = "search:" + clientIp;
            maxRequests = 100;
            windowSeconds = 60;
        } else if (path.contains("/github")) {
            rateKey = "github:" + clientIp;
            maxRequests = 10;
            windowSeconds = 3600;
        } else if (path.startsWith("/api/v1/tools") && "POST".equalsIgnoreCase(method)) {
            rateKey = "tool_publish:" + clientIp;
            maxRequests = 20;
            windowSeconds = 86400;
        }

        if (rateKey != null) {
            boolean allowed = rateLimitingService.isAllowed(rateKey, maxRequests, windowSeconds);
            if (!allowed) {
                long retryAfter = rateLimitingService.getRetryAfterSeconds(rateKey, windowSeconds);
                log.warn("[RateLimit Exceeded] Path: {}, IP: {}, Retry-After: {}s", path, clientIp, retryAfter);
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(retryAfter));
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Too Many Requests. Rate limit exceeded.\",\"data\":null,\"meta\":{\"retryAfter\":" + retryAfter + "}}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}
