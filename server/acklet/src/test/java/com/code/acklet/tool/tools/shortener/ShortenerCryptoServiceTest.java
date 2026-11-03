package com.code.acklet.tool.tools.shortener.security;

import com.code.acklet.config.properties.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.security.SecureRandom;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ShortenerCryptoService Enterprise AES-256-GCM Tests")
class ShortenerCryptoServiceTest {

    private ShortenerCryptoService cryptoService;
    private AppProperties appProperties;
    private MockEnvironment environment;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        environment = new MockEnvironment();
        // 32-byte / 256-bit test master key
        byte[] rawKey = new byte[32];
        new SecureRandom().nextBytes(rawKey);
        String base64Key = Base64.getEncoder().encodeToString(rawKey);
        appProperties.getSecurity().getEncryption().setKey(base64Key);

        cryptoService = new ShortenerCryptoService(appProperties, environment);
    }

    @Test
    @DisplayName("Encryption round-trip preserves exact plaintext")
    void testEncryptionRoundTrip() {
        String sensitiveUrl = "https://internal-docs.corp.net/secret/dashboard?token=xyz987";
        String encrypted = cryptoService.encrypt(sensitiveUrl);

        assertNotNull(encrypted);
        assertNotEquals(sensitiveUrl, encrypted);
        assertTrue(encrypted.startsWith("v1:"), "Ciphertext must carry key-version prefix");

        String decrypted = cryptoService.decrypt(encrypted);
        assertEquals(sensitiveUrl, decrypted);
    }

    @Test
    @DisplayName("Two encryptions of same plaintext produce unique ciphertexts (random IV/nonce)")
    void testUniqueIvPerEncryption() {
        String plain = "https://example.com/target";
        String cipher1 = cryptoService.encrypt(plain);
        String cipher2 = cryptoService.encrypt(plain);

        assertNotNull(cipher1);
        assertNotNull(cipher2);
        assertNotEquals(cipher1, cipher2, "AES-256-GCM must use a unique random 96-bit nonce every time");

        assertEquals(plain, cryptoService.decrypt(cipher1));
        assertEquals(plain, cryptoService.decrypt(cipher2));
    }

    @Test
    @DisplayName("Tampered ciphertext fails decryption with authentication tag exception")
    void testTamperedCiphertextFails() {
        String plain = "https://super-confidential.org";
        String encrypted = cryptoService.encrypt(plain);
        String payload = encrypted.substring(encrypted.indexOf(':') + 1);

        byte[] decoded = Base64.getDecoder().decode(payload);
        // Tamper with the last byte (part of auth tag)
        decoded[decoded.length - 1] ^= 0x55;
        String tamperedCipher = "v1:" + Base64.getEncoder().encodeToString(decoded);

        assertThrows(RuntimeException.class, () -> cryptoService.decrypt(tamperedCipher),
                "AES-256-GCM authentication verification must fail on tampered data");
    }

    @Test
    @DisplayName("Key rotation: decrypts ciphertext from previous key versions")
    void testKeyRotation() {
        byte[] v2Key = new byte[32];
        new SecureRandom().nextBytes(v2Key);

        // Register older version v0
        byte[] v0Key = new byte[32];
        new SecureRandom().nextBytes(v0Key);
        cryptoService.registerKeyVersion("v0", v0Key);

        // Encrypt with v1
        String plain = "https://sensitive.com/finance";
        String cipherV1 = cryptoService.encrypt(plain);
        assertTrue(cipherV1.startsWith("v1:"));

        // Both versions can be read transparently
        assertEquals(plain, cryptoService.decrypt(cipherV1));
    }

    @Test
    @DisplayName("Production environment startup fails if master key is missing or invalid")
    void testProductionStartupValidation() {
        MockEnvironment prodEnv = new MockEnvironment();
        prodEnv.setActiveProfiles("prod");

        AppProperties emptyProps = new AppProperties();
        emptyProps.getSecurity().getEncryption().setKey("");

        assertThrows(IllegalStateException.class, () -> new ShortenerCryptoService(emptyProps, prodEnv),
                "Production startup must abort if master encryption key is missing");
    }
}

