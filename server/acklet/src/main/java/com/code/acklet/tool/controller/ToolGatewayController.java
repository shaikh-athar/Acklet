package com.code.acklet.tool.controller;

import com.code.acklet.github.entity.Repository;
import com.code.acklet.github.repository.RepositoryRepository;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.tool.repository.ToolRepository;
import com.code.acklet.tool.service.ToolRegistryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.HandlerMapping;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ToolGatewayController {

    private final ToolRegistryService toolRegistryService;
    private final ToolRepository toolRepository;
    private final RepositoryRepository repositoryRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @RequestMapping(value = "/tools/{slug}/**")
    public ResponseEntity<byte[]> proxyRequest(
            @PathVariable String slug,
            HttpMethod method,
            @RequestBody(required = false) byte[] body,
            HttpServletRequest request) {

        // 1. Resolve slug to registered tool
        Optional<ToolRegistryService.RegisteredTool> optTool = toolRegistryService.getRegisteredTool(slug);
        if (optTool.isEmpty()) {
            log.warn("Gateway: Request to unregistered tool slug: {}", slug);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(("Tool '" + slug + "' not found or not active.").getBytes());
        }

        ToolRegistryService.RegisteredTool registeredTool = optTool.get();
        int port = registeredTool.getPort();

        // 2. Resolve request path suffix
        String fullPath = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        String prefix = "/tools/" + slug;
        String suffix = "";
        if (fullPath.startsWith(prefix)) {
            suffix = fullPath.substring(prefix.length());
        }
        if (suffix.isEmpty()) {
            suffix = "/";
        }

        // 3. Fallback: Check if we can serve static files directly from the workspace dist/build directory
        Optional<Tool> toolOpt = toolRepository.findBySlug(slug);
        if (toolOpt.isPresent() && toolOpt.get().getRepositoryId() != null) {
            Optional<Repository> repoOpt = repositoryRepository.findById(toolOpt.get().getRepositoryId());
            if (repoOpt.isPresent()) {
                Path workspaceDir = Path.of("a:\\Acklet\\server\\acklet\\workspaces", repoOpt.get().getFullName().replace('/', '_'));
                Path distDir = workspaceDir.resolve("dist");
                if (!Files.exists(distDir)) {
                    distDir = workspaceDir.resolve("build");
                }
                if (!Files.exists(distDir)) {
                    distDir = workspaceDir.resolve("public");
                }

                if (Files.exists(distDir)) {
                    String relativeFilePath = suffix.startsWith("/") ? suffix.substring(1) : suffix;
                    Path fileToServe = distDir.resolve(relativeFilePath);
                    if (Files.isDirectory(fileToServe)) {
                        fileToServe = fileToServe.resolve("index.html");
                    }
                    if (!Files.exists(fileToServe) || Files.isDirectory(fileToServe)) {
                        fileToServe = distDir.resolve("index.html");
                    }
                    if (Files.exists(fileToServe) && !Files.isDirectory(fileToServe)) {
                        try {
                            byte[] fileBytes = Files.readAllBytes(fileToServe);
                            String contentType = Files.probeContentType(fileToServe);
                            if (contentType == null) {
                                if (fileToServe.toString().endsWith(".js")) {
                                    contentType = "application/javascript";
                                } else if (fileToServe.toString().endsWith(".css")) {
                                    contentType = "text/css";
                                } else if (fileToServe.toString().endsWith(".html")) {
                                    contentType = "text/html";
                                } else {
                                    contentType = "application/octet-stream";
                                }
                            }
                            return ResponseEntity.ok()
                                    .header(HttpHeaders.CONTENT_TYPE, contentType)
                                    .body(fileBytes);
                        } catch (Exception e) {
                            log.error("Failed to read static file {} from workspace: {}", fileToServe, e.getMessage());
                        }
                    }
                }
            }
        }

        // 4. Construct target URI for active server applications
        String targetUrl = "http://localhost:" + port + suffix;
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isBlank()) {
            targetUrl += "?" + queryString;
        }

        log.debug("Gateway Proxy: Routing {} request to {}", method, targetUrl);

        // 5. Forward headers
        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            if (headerName.equalsIgnoreCase("host")) {
                continue;
            }
            headers.addAll(headerName, Collections.list(request.getHeaders(headerName)));
        }

        HttpEntity<byte[]> httpEntity = new HttpEntity<>(body, headers);

        try {
            return restTemplate.exchange(
                    URI.create(targetUrl),
                    method,
                    httpEntity,
                    byte[].class
            );
        } catch (HttpStatusCodeException e) {
            log.error("Gateway Proxy: Target returned error status: {} for {}", e.getStatusCode(), targetUrl);
            return ResponseEntity.status(e.getStatusCode())
                    .headers(e.getResponseHeaders())
                    .body(e.getResponseBodyAsByteArray());
        } catch (Exception e) {
            log.error("Gateway Proxy: Failed to connect to tool {} on port {}: {}", slug, port, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(("Tool gateway connection failed. Is the application running on port " + port + "? Error: " + e.getMessage()).getBytes());
        }
    }
}
