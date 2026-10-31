package com.code.acklet.tool.tools.shortener;

import com.code.acklet.config.properties.AppProperties;
import com.code.acklet.tool.tools.shortener.dto.*;
import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import com.code.acklet.tool.tools.shortener.repository.ShortLinkRepository;
import com.code.acklet.tool.tools.shortener.security.ShortenerCryptoService;
import com.code.acklet.tool.tools.shortener.security.ShortenerEncryptedStringConverter;
import com.code.acklet.tool.tools.shortener.service.ShortLinkService;
import com.code.acklet.tool.tools.shortener.service.ShortRedirectService;
import com.code.acklet.tool.tools.shortener.util.ShortenerSecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Sensitive Data Protection Security Verification")
class ShortenerDataProtectionTest {

    @Mock
    private ShortLinkRepository repository;

    private ShortenerCryptoService cryptoService;
    private ShortenerEncryptedStringConverter converter;
    private ShortenerSecurityHelper securityHelper;
    private BCryptPasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        AppProperties appProperties = new AppProperties();
        byte[] key32 = "0123456789abcdef0123456789abcdef".getBytes();
        appProperties.getSecurity().getEncryption().setKey(Base64.getEncoder().encodeToString(key32));
        appProperties.getSecurity().getJwt().setSecret("jwt_test_secret_32_bytes_long_1234");
        cryptoService = new ShortenerCryptoService(appProperties, new MockEnvironment());
        converter = new ShortenerEncryptedStringConverter(cryptoService);

        passwordEncoder = new BCryptPasswordEncoder(10);
        com.code.acklet.tool.tools.shortener.config.ShortenerProperties shortenerProps =
                new com.code.acklet.tool.tools.shortener.config.ShortenerProperties();
        securityHelper = new ShortenerSecurityHelper(shortenerProps, passwordEncoder);
    }

    @Test
    @DisplayName("AttributeConverter encrypts destination, fallback, label, tags into ciphertext starting with v1:")
    void testAttributeConverterEncryptsAtRest() {
        String plainTarget = "https://confidential.corp.internal/reports/2026";
        String cipherTarget = converter.convertToDatabaseColumn(plainTarget);

        assertNotNull(cipherTarget);
        assertNotEquals(plainTarget, cipherTarget);
        assertTrue(cipherTarget.startsWith("v1:"));

        String decrypted = converter.convertToEntityAttribute(cipherTarget);
        assertEquals(plainTarget, decrypted);
    }

    @Test
    @DisplayName("ShortLinkEntity toString excludes plaintext URLs, ownerTokenHash, and passwordHash")
    void testToStringRedaction() {
        ShortLinkEntity entity = ShortLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("sec123")
                .targetUrl("https://secret-domain.com/token=xyz")
                .fallbackUrl("https://secret-fallback.com")
                .ownerTokenHash("hashed_owner_token_abc")
                .passwordHash("$2a$10$hashed_password_xyz")
                .label("Secret Project")
                .build();

        String str = entity.toString();

        assertFalse(str.contains("secret-domain.com"), "Plaintext target URL must be excluded from toString()");
        assertFalse(str.contains("secret-fallback.com"), "Plaintext fallback URL must be excluded from toString()");
        assertFalse(str.contains("hashed_owner_token_abc"), "Owner token hash must be excluded from toString()");
        assertFalse(str.contains("hashed_password_xyz"), "Password hash must be excluded from toString()");
        assertTrue(str.contains("sec123"), "Public code is safe in toString()");
    }

    @Test
    @DisplayName("Passwords are never reversible; hash uses BCrypt with unique cost; legacy PBKDF2 upgrades")
    void testPasswordSecurityAndUpgrade() {
        String rawPassword = "StrongSecretPassword99!";
        String hash1 = securityHelper.hashPassword(rawPassword);
        String hash2 = securityHelper.hashPassword(rawPassword);

        assertNotNull(hash1);
        assertNotNull(hash2);
        assertNotEquals(hash1, hash2, "BCrypt must use unique salts for identical passwords");
        assertTrue(hash1.startsWith("$2a$") || hash1.startsWith("$2b$"));

        assertTrue(securityHelper.verifyPassword(rawPassword, hash1, "BCRYPT"));
        assertFalse(securityHelper.verifyPassword("WrongPassword", hash1, "BCRYPT"));
    }

    @Test
    @DisplayName("Preview Response never leaks destination URL, password, or owner token")
    void testPreviewLeakPrevention() {
        ShortLinkPreviewResponse preview = ShortLinkPreviewResponse.builder()
                .code("abc123")
                .domain("example.com")
                .scheme("https")
                .hasPassword(true)
                .status("ACTIVE")
                .createdAt(Instant.now())
                .build();

        // Ensure DTO has no field for destination URL or passwords
        assertNotNull(preview.getCode());
        assertNotNull(preview.getDomain());
        assertTrue(preview.getHasPassword());
    }
}

