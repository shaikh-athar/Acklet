package com.code.acklet.tool.tools.qr.util;

import lombok.extern.slf4j.Slf4j;

import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

@Slf4j
public final class QrSecurityUtil {

    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

    private QrSecurityUtil() {}

    /**
     * Compute hex-encoded SHA-256 hash.
     */
    public static String sha256(String input) {
        if (input == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    /**
     * Normalize string using Unicode Canonical Decomposition followed by Canonical Composition (NFC).
     */
    public static String normalizeNfc(String input) {
        if (input == null) return null;
        return Normalizer.normalize(input, Normalizer.Form.NFC);
    }

    /**
     * Validate URL destination.
     * Enforces scheme allowlist (http/https only) and rejects malicious pseudoprotocols.
     * Optionally blocks RFC1918 private / loopback IP addresses in production.
     */
    public static void validateTargetUrl(String url, boolean blockPrivateTargets) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("URL target cannot be empty");
        }

        String trimmed = url.trim();
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed URL target: " + e.getMessage());
        }

        String scheme = uri.getScheme();
        if (scheme == null || !ALLOWED_SCHEMES.contains(scheme.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("URL scheme must be http or https. Disallowed scheme: " + scheme);
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL must contain a valid domain or host");
        }

        if (blockPrivateTargets) {
            String lowerHost = host.toLowerCase(Locale.ROOT);
            if ("localhost".equals(lowerHost) || lowerHost.endsWith(".localhost") || "127.0.0.1".equals(lowerHost) || "::1".equals(lowerHost) || "0.0.0.0".equals(lowerHost)) {
                throw new IllegalArgumentException("Targeting localhost or private network is forbidden");
            }

            try {
                InetAddress addr = InetAddress.getByName(host);
                if (addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isLinkLocalAddress() || addr.isAnyLocalAddress()) {
                    throw new IllegalArgumentException("Targeting private IP ranges is forbidden: " + host);
                }
            } catch (Exception e) {
                // If DNS resolution fails, allow saving unless host was explicitly private
                log.debug("[QrSecurityUtil] DNS resolution check for {} returned: {}", host, e.getMessage());
            }
        }
    }
}
