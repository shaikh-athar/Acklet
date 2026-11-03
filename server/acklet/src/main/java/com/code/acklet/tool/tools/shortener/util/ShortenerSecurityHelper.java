package com.code.acklet.tool.tools.shortener.util;

import com.code.acklet.tool.tools.shortener.config.ShortenerProperties;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.net.IDN;
import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class ShortenerSecurityHelper {

    private final ShortenerProperties properties;
    private final PasswordEncoder passwordEncoder;

    private static final String BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final Pattern ALIAS_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{3,30}$");
    private static final Set<String> ALLOWED_SCHEMES = Set.of("http", "https");

    private static final Set<String> RESERVED_SLUGS = Set.of(
            "api", "s", "q", "links", "unlock", "report", "admin", "www",
            "auth", "login", "register", "logout", "settings", "terms", "privacy",
            "about", "contact", "help", "docs", "tools", "dashboard", "portal",
            "shortener", "urlshortener", "clipboard", "qr", "static", "assets",
            "favicon.ico", "robots.txt", "health", "actuator", "app", "root"
    );

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Validates target or fallback URL strictly according to security requirements:
     * - http or https scheme only
     * - length <= 2048 chars
     * - reject credentials (user:pass@)
     * - normalize IDN hostname to punycode
     * - block localhost, private and link-local ranges, and IP-literal hosts in those ranges
     * - reject short domain itself (prevent redirect loops)
     */
    public String validateAndNormalizeUrl(String rawUrl, boolean isRequired) {
        if (rawUrl == null || rawUrl.isBlank()) {
            if (isRequired) {
                throw new IllegalArgumentException("Destination URL is required");
            }
            return null;
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

        // Check internal short domains to prevent redirect loops
        for (String shortDomain : properties.getSecurity().getShortDomains()) {
            if (asciiHost.equalsIgnoreCase(shortDomain) || asciiHost.endsWith("." + shortDomain)) {
                throw new IllegalArgumentException("Short link destination cannot point to Acklet shortener itself");
            }
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
                throw new IllegalArgumentException("Destination URL cannot point to localhost or loopback network");
            }

            try {
                InetAddress addr = InetAddress.getByName(asciiHost);
                if (addr.isLoopbackAddress() || addr.isSiteLocalAddress() || addr.isLinkLocalAddress() || addr.isAnyLocalAddress()) {
                    throw new IllegalArgumentException("Targeting private IP ranges is forbidden: " + asciiHost);
                }
            } catch (Exception e) {
                // If DNS fails during validation, reject unresolvable private-like hostnames
                if (asciiHost.startsWith("10.") || asciiHost.startsWith("192.168.") || asciiHost.startsWith("169.254.")) {
                    throw new IllegalArgumentException("Targeting private network ranges is forbidden: " + asciiHost);
                }
            }
        }

        // Reconstruct canonical URL with normalized punycode host
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
     * Validates a custom alias.
     */
    public void validateCustomAlias(String alias) {
        if (alias == null || alias.isBlank()) return;
        if (!ALIAS_PATTERN.matcher(alias).matches()) {
            throw new IllegalArgumentException("Alias must be 3-30 characters and contain only letters, numbers, hyphens, and underscores");
        }
        if (RESERVED_SLUGS.contains(alias.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("That alias is reserved and cannot be used");
        }
    }

    /**
     * Checks if a code is in the reserved list.
     */
    public boolean isReservedSlug(String code) {
        if (code == null) return true;
        return RESERVED_SLUGS.contains(code.toLowerCase(Locale.ROOT));
    }

    /**
     * Generates a cryptographically random Base62 slug.
     */
    public String generateRandomSlug(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(BASE62_CHARS.charAt(secureRandom.nextInt(BASE62_CHARS.length())));
        }
        return sb.toString();
    }

    /**
     * Generates a new anonymous owner management token.
     */
    public String generateOwnerToken() {
        byte[] randomBytes = new byte[24];
        secureRandom.nextBytes(randomBytes);
        return "tok_" + HexFormat.of().formatHex(randomBytes);
    }

    /**
     * Hashes an owner token using SHA-256 for persistent database storage.
     */
    public String hashOwnerToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
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
            log.error("[ShortenerSecurity] HMAC-SHA256 calculation failed", e);
            return "hash_error";
        }
    }

    /**
     * Hashes a password using Spring Security's BCrypt.
     */
    public String hashPassword(String password) {
        if (password == null || password.isBlank()) return null;
        if (password.length() < properties.getMinPasswordLength()) {
            throw new IllegalArgumentException("Password must be at least " + properties.getMinPasswordLength() + " characters");
        }
        return passwordEncoder.encode(password);
    }

    /**
     * Verifies password against either primary BCrypt or legacy PBKDF2-SHA256 hash.
     */
    public boolean verifyPassword(String rawPassword, String storedHash, String scheme) {
        if (rawPassword == null || storedHash == null) return false;

        if ("PBKDF2_SHA256".equalsIgnoreCase(scheme) || storedHash.startsWith("pbkdf2:100000:")) {
            return verifyLegacyPbkdf2(rawPassword, storedHash);
        }

        // Default: BCrypt
        try {
            return passwordEncoder.matches(rawPassword, storedHash);
        } catch (Exception e) {
            log.warn("[ShortenerSecurity] Password verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verifies legacy client PBKDF2-SHA256 hash formatted as:
     * pbkdf2:100000:<saltHex>:<hashHex>
     */
    public boolean verifyLegacyPbkdf2(String rawPassword, String storedHash) {
        if (rawPassword == null || storedHash == null) return false;
        String[] parts = storedHash.split(":");
        if (parts.length != 4 || !"pbkdf2".equalsIgnoreCase(parts[0])) {
            return false;
        }
        try {
            int iterations = Integer.parseInt(parts[1]);
            byte[] salt = HexFormat.of().parseHex(parts[2]);
            byte[] expectedHash = HexFormat.of().parseHex(parts[3]);

            PBEKeySpec spec = new PBEKeySpec(rawPassword.toCharArray(), salt, iterations, 256);
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] derived = skf.generateSecret(spec).getEncoded();

            return MessageDigest.isEqual(derived, expectedHash);
        } catch (Exception e) {
            log.warn("[ShortenerSecurity] Legacy PBKDF2 verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generates a signed unlock token for cookie-based session verification.
     */
    public String generateUnlockToken(String code) {
        long expiry = Instant.now().getEpochSecond() + properties.getSecurity().getUnlockSessionSeconds();
        String payload = code + ":" + expiry;
        String signature = hmacSign(payload);
        return payload + ":" + signature;
    }

    /**
     * Verifies a signed unlock token for a given code.
     */
    public boolean verifyUnlockToken(String token, String code) {
        if (token == null || code == null) return false;
        String[] parts = token.split(":");
        if (parts.length != 3) return false;

        String tokenCode = parts[0];
        long expiry;
        try {
            expiry = Long.parseLong(parts[1]);
        } catch (NumberFormatException e) {
            return false;
        }
        String signature = parts[2];

        if (!code.equals(tokenCode)) return false;
        if (Instant.now().getEpochSecond() > expiry) return false;

        String expectedSignature = hmacSign(tokenCode + ":" + expiry);
        return MessageDigest.isEqual(
                signature.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String hmacSign(String data) {
        String secret = properties.getSecurity().getUnlockSigningSecret();
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC signing failed", e);
        }
    }

    /**
     * Computes link status following the deterministic evaluation order:
     * 1. DEACTIVATED (if deleted_at != null or is_deactivated == true)
     * 2. SCHEDULED (if start_date != null and start_date > now)
     * 3. EXPIRED (if expires_at != null and expires_at <= now)
     * 4. LIMIT_REACHED (if is_one_time == true && clicks >= 1 or max_clicks != null && clicks >= max_clicks)
     * 5. ACTIVE
     */
    public String computeStatus(ShortLinkEntity entity) {
        if (entity.getDeletedAt() != null || Boolean.TRUE.equals(entity.getIsDeactivated())) {
            return "DEACTIVATED";
        }
        Instant now = Instant.now();
        if (entity.getStartDate() != null && entity.getStartDate().isAfter(now)) {
            return "SCHEDULED";
        }
        if (entity.getExpiresAt() != null && !entity.getExpiresAt().isAfter(now)) {
            return "EXPIRED";
        }
        if (Boolean.TRUE.equals(entity.getIsOneTime()) && entity.getClicks() != null && entity.getClicks() >= 1) {
            return "LIMIT_REACHED";
        }
        if (entity.getMaxClicks() != null && entity.getClicks() != null && entity.getClicks() >= entity.getMaxClicks()) {
            return "LIMIT_REACHED";
        }
        return "ACTIVE";
    }
}
