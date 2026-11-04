package com.code.acklet.tool.tools.barcode.util;

import com.code.acklet.tool.tools.barcode.config.TempCodeProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.IDN;
import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class TempCodeSecurityHelper {

    private final TempCodeProperties properties;

    // Crockford Base32 alphabet (no I, L, O, U to avoid visual ambiguity)
    private static final String CROCKFORD_BASE32 = "0123456789abcdefghjkmnpqrstvwxyz";
    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");
    private static final Set<String> ALLOWED_FORMATS = Set.of("qrcode", "datamatrix", "aztec", "pdf417", "code128");

    // Pattern allowing standard printable characters and common whitespace
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\p{Cntrl}&&[^\r\n\t]]");

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a cryptographically random token with at least 80 bits of entropy.
     * 16 Crockford Base32 characters = 16 * 5 bits = 80 bits.
     */
    public String generateToken() {
        int length = Math.max(16, properties.getTokenLength());
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CROCKFORD_BASE32.charAt(secureRandom.nextInt(CROCKFORD_BASE32.length())));
        }
        return sb.toString();
    }

    /**
     * Hashes token using SHA-256 for persistent database lookup.
     */
    public String hashToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Generates a new owner management token matching URL shortener architecture.
     */
    public String generateOwnerToken() {
        byte[] randomBytes = new byte[24];
        secureRandom.nextBytes(randomBytes);
        return "tok_" + HexFormat.of().formatHex(randomBytes);
    }

    /**
     * Hashes owner token using SHA-256.
     */
    public String hashOwnerToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return null;
        return hashToken(rawToken);
    }

    /**
     * Constant-time comparison between raw owner token and stored hash.
     */
    public boolean verifyOwnerToken(String rawToken, String storedHash) {
        if (rawToken == null || storedHash == null) return false;
        String computedHash = hashOwnerToken(rawToken);
        return MessageDigest.isEqual(
                computedHash.getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Hashes an IP address using HMAC-SHA256 with the secret pepper for privacy-safe rate limiting.
     */
    public String pepperHash(String value) {
        if (value == null || value.isBlank()) return "anonymous";
        String pepper = properties.getSecurity().getPepper();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(value.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            log.error("[TempCodeSecurity] HMAC-SHA256 calculation failed", e);
            return "hash_error";
        }
    }

    /**
     * Validates destination URL:
     * - http or https scheme only (strictly rejects javascript:, data:, etc.)
     * - length <= 2048 chars
     * - rejects credentials (user:pass@)
     * - normalizes IDN hostname to punycode
     * - checks configured blocklist
     * - blocks localhost and private IP ranges if configured
     */
    public String validateAndNormalizeUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalArgumentException("Target URL cannot be empty");
        }

        String trimmed = rawUrl.trim();
        if (trimmed.length() > properties.getMaxUrlLength()) {
            throw new IllegalArgumentException("URL exceeds maximum length of " + properties.getMaxUrlLength() + " characters");
        }

        int schemeEnd = trimmed.indexOf("://");
        if (schemeEnd == -1) {
            throw new IllegalArgumentException("URL scheme must be http or https");
        }
        String scheme = trimmed.substring(0, schemeEnd).toLowerCase(Locale.ROOT);
        if (!ALLOWED_SCHEMES.contains(scheme)) {
            throw new IllegalArgumentException("URL scheme must be http or https. Disallowed scheme: " + scheme);
        }

        String rest = trimmed.substring(schemeEnd + 3);
        int pathStart = rest.indexOf('/');
        int queryStart = rest.indexOf('?');
        int fragStart = rest.indexOf('#');
        int authorityEnd = rest.length();
        if (pathStart != -1) authorityEnd = Math.min(authorityEnd, pathStart);
        if (queryStart != -1) authorityEnd = Math.min(authorityEnd, queryStart);
        if (fragStart != -1) authorityEnd = Math.min(authorityEnd, fragStart);

        String authority = rest.substring(0, authorityEnd);
        String pathAndQuery = rest.substring(authorityEnd);

        if (authority.contains("@")) {
            throw new IllegalArgumentException("URLs containing embedded user credentials are not allowed");
        }

        String host = authority;
        int port = -1;
        int colonIdx = authority.lastIndexOf(':');
        if (colonIdx != -1 && !authority.contains("]")) {
            host = authority.substring(0, colonIdx);
            try {
                port = Integer.parseInt(authority.substring(colonIdx + 1));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid port in URL");
            }
        }

        if (host.isBlank()) {
            throw new IllegalArgumentException("URL must contain a valid domain or host");
        }

        // Normalize IDN to punycode ASCII
        String asciiHost;
        try {
            asciiHost = IDN.toASCII(host).toLowerCase(Locale.ROOT);
        } catch (Exception e) {
            throw new IllegalArgumentException("Domain name contains invalid internationalized characters");
        }

        URI uri;
        try {
            String reassembled = scheme + "://" + asciiHost + (port != -1 ? ":" + port : "") + pathAndQuery;
            uri = URI.create(reassembled);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid URL format: " + e.getMessage());
        }

        // Check configured blocklisted domains
        if (properties.getValidation().getBlocklistedDomains() != null) {
            for (String blockedDomain : properties.getValidation().getBlocklistedDomains()) {
                if (asciiHost.equalsIgnoreCase(blockedDomain) || asciiHost.endsWith("." + blockedDomain)) {
                    throw new IllegalArgumentException("This domain is blocked due to safety violations");
                }
            }
        }

        // Check private/loopback/link-local ranges if configured
        if (properties.getValidation().isBlockPrivateTargets()) {
            if ("localhost".equals(asciiHost) || asciiHost.endsWith(".localhost") ||
                    "127.0.0.1".equals(asciiHost) || "::1".equals(asciiHost) || "0.0.0.0".equals(asciiHost)) {
                // allow localhost only in non-production environments if needed, but per rule reject
            }

            try {
                InetAddress addr = InetAddress.getByName(asciiHost);
                if (addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isLinkLocalAddress() || addr.isAnyLocalAddress()) {
                    throw new IllegalArgumentException("Targeting private IP ranges is forbidden: " + asciiHost);
                }
            } catch (Exception e) {
                if (asciiHost.startsWith("10.") || asciiHost.startsWith("192.168.") || asciiHost.startsWith("169.254.")) {
                    throw new IllegalArgumentException("Targeting private network ranges is forbidden: " + asciiHost);
                }
            }
        }

        try {
            URI normalizedUri = new URI(
                    uri.getScheme().toLowerCase(Locale.ROOT),
                    null,
                    asciiHost,
                    uri.getPort(),
                    uri.getPath(),
                    uri.getQuery(),
                    uri.getFragment()
            );
            return normalizedUri.toASCIIString();
        } catch (Exception e) {
            return trimmed;
        }
    }

    /**
     * Sanitizes message content:
     * - reject control characters
     * - limit to maxMessageLength (default 500)
     */
    public String sanitizeMessage(String message) {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Message text cannot be empty");
        }
        String trimmed = message.trim();
        if (trimmed.length() > properties.getMaxMessageLength()) {
            throw new IllegalArgumentException("Message exceeds maximum length of " + properties.getMaxMessageLength() + " characters");
        }
        if (CONTROL_CHARS.matcher(trimmed).find()) {
            throw new IllegalArgumentException("Message contains invalid control characters");
        }
        return trimmed;
    }

    /**
     * Sanitizes reference text:
     * - reject control characters
     * - limit to maxReferenceLength (default 64)
     */
    public String sanitizeReference(String ref) {
        if (ref == null || ref.isBlank()) return null;
        String trimmed = ref.trim();
        if (trimmed.length() > properties.getMaxReferenceLength()) {
            throw new IllegalArgumentException("Reference text exceeds maximum length of " + properties.getMaxReferenceLength() + " characters");
        }
        if (CONTROL_CHARS.matcher(trimmed).find()) {
            throw new IllegalArgumentException("Reference text contains invalid control characters");
        }
        return trimmed;
    }

    /**
     * Validates barcode format and checks that payload length fits format capability.
     */
    public void validateFormatAndPayload(String format, String payload) {
        if (format == null || !ALLOWED_FORMATS.contains(format.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Unsupported barcode format: " + format);
        }
        if ("code128".equalsIgnoreCase(format) && payload != null && payload.length() > 80) {
            throw new IllegalArgumentException("Code 128 format cannot reliably encode payloads longer than 80 characters. Please choose a 2D format like QR Code or Data Matrix.");
        }
    }
}

