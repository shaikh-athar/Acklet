package com.code.acklet.tool.tools.shortener;

import com.code.acklet.tool.tools.shortener.config.ShortenerProperties;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import com.code.acklet.tool.tools.shortener.util.ShortenerSecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ShortenerSecurityHelperTest {

    private ShortenerSecurityHelper helper;
    private ShortenerProperties properties;

    @BeforeEach
    void setUp() {
        properties = new ShortenerProperties();
        properties.getSecurity().setPepper("test_secret_pepper_12345");
        properties.getSecurity().setUnlockSigningSecret("test_unlock_secret_key_12345");
        properties.getSecurity().setShortDomains(List.of("urlshortener.localhost", "localhost", "acklet.com"));
        properties.getValidation().setBlockPrivateTargets(true);
        properties.setMinPasswordLength(6);

        helper = new ShortenerSecurityHelper(properties, new BCryptPasswordEncoder());
    }

    @Test
    @DisplayName("Should accept valid HTTP and HTTPS URLs and normalize IDN to punycode")
    void testValidUrls() {
        String clean = helper.validateAndNormalizeUrl("https://example.com/path?foo=bar", true);
        assertEquals("https://example.com/path?foo=bar", clean);

        String idn = helper.validateAndNormalizeUrl("https://bücher.de/shop", true);
        assertTrue(idn.contains("xn--bcher-kva.de"));
    }

    @Test
    @DisplayName("Should reject invalid schemes, credentials, and loops")
    void testInvalidUrls() {
        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("javascript:alert(1)", true));

        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("ftp://files.example.com", true));

        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("https://user:password@example.com/secret", true));

        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("https://acklet.com/s/loop", true));
    }

    @Test
    @DisplayName("Should block localhost and private network ranges")
    void testBlockPrivateTargets() {
        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("http://localhost:8080/admin", true));

        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("http://127.0.0.1/admin", true));

        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("http://192.168.1.1/router", true));

        assertThrows(IllegalArgumentException.class, () ->
                helper.validateAndNormalizeUrl("http://10.0.0.1/internal", true));
    }

    @Test
    @DisplayName("Should validate and verify passwords using BCrypt and legacy PBKDF2-SHA256")
    void testPasswordHashingAndLegacyPbkdf2() {
        String pass = "strongSecret123";
        String bcryptHash = helper.hashPassword(pass);
        assertNotNull(bcryptHash);
        assertTrue(helper.verifyPassword(pass, bcryptHash, "BCRYPT"));
        assertFalse(helper.verifyPassword("wrongSecret", bcryptHash, "BCRYPT"));

        // Legacy format: pbkdf2:100000:<saltHex>:<hashHex>
        // Pre-computed PBKDF2-SHA256 hash for password "secret123" with salt "0123456789abcdef0123456789abcdef" (16 bytes = 32 hex chars)
        // Let's generate a legacy PBKDF2 hash using javax.crypto
        try {
            byte[] salt = java.util.HexFormat.of().parseHex("0123456789abcdef0123456789abcdef");
            javax.crypto.spec.PBEKeySpec spec = new javax.crypto.spec.PBEKeySpec("secret123".toCharArray(), salt, 100000, 256);
            javax.crypto.SecretKeyFactory skf = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] hash = skf.generateSecret(spec).getEncoded();
            String legacyHash = "pbkdf2:100000:0123456789abcdef0123456789abcdef:" + java.util.HexFormat.of().formatHex(hash);

            assertTrue(helper.verifyPassword("secret123", legacyHash, "PBKDF2_SHA256"));
            assertFalse(helper.verifyPassword("wrongpass", legacyHash, "PBKDF2_SHA256"));
        } catch (Exception e) {
            fail("PBKDF2 generation failed: " + e.getMessage());
        }
    }

    @Test
    @DisplayName("Should generate, sign and verify short-lived unlock tokens")
    void testUnlockTokenVerification() {
        String code = "test123";
        String token = helper.generateUnlockToken(code);
        assertNotNull(token);

        assertTrue(helper.verifyUnlockToken(token, code));
        assertFalse(helper.verifyUnlockToken(token, "othercode"));
        assertFalse(helper.verifyUnlockToken(token + "tampered", code));
    }

    @Test
    @DisplayName("Should compute status following strict priority order")
    void testStatusComputation() {
        Instant now = Instant.now();

        // 1. Deactivated
        ShortLinkEntity deact = ShortLinkEntity.builder()
                .isDeactivated(true)
                .build();
        assertEquals("DEACTIVATED", helper.computeStatus(deact));

        // 2. Scheduled
        ShortLinkEntity sched = ShortLinkEntity.builder()
                .isDeactivated(false)
                .startDate(now.plus(1, ChronoUnit.HOURS))
                .build();
        assertEquals("SCHEDULED", helper.computeStatus(sched));

        // 3. Expired
        ShortLinkEntity exp = ShortLinkEntity.builder()
                .isDeactivated(false)
                .expiresAt(now.minus(1, ChronoUnit.MINUTES))
                .build();
        assertEquals("EXPIRED", helper.computeStatus(exp));

        // 4. One-time consumed
        ShortLinkEntity oneTime = ShortLinkEntity.builder()
                .isDeactivated(false)
                .isOneTime(true)
                .clicks(1L)
                .build();
        assertEquals("LIMIT_REACHED", helper.computeStatus(oneTime));

        // 5. Max clicks reached
        ShortLinkEntity maxClicks = ShortLinkEntity.builder()
                .isDeactivated(false)
                .clicks(10L)
                .maxClicks(10L)
                .build();
        assertEquals("LIMIT_REACHED", helper.computeStatus(maxClicks));

        // 6. Active
        ShortLinkEntity active = ShortLinkEntity.builder()
                .isDeactivated(false)
                .clicks(3L)
                .maxClicks(10L)
                .expiresAt(now.plus(10, ChronoUnit.DAYS))
                .build();
        assertEquals("ACTIVE", helper.computeStatus(active));
    }
}
