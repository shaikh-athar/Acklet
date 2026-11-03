package com.code.acklet.tool.tools.shortener.security;

import com.code.acklet.config.properties.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Enterprise AES-256-GCM field-level encryption with:
 * - 96-bit (12-byte) random nonce per encryption
 * - 128-bit authentication tag
 * - Key version prefix ("v1:...") enabling seamless key rotation
 * - Strict key length validation (32 bytes / 256 bits)
 * - Production startup validation preventing startup with insecure/missing keys
 */
@Slf4j
@Component
public class ShortenerCryptoService {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits
    private static final int GCM_TAG_LENGTH = 128; // 128 bits auth tag

    public static final String CURRENT_KEY_VERSION = "v1";

    private final Map<String, SecretKey> keysByVersion = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public ShortenerCryptoService(AppProperties appProperties, Environment environment) {
        String keyConfig = appProperties.getSecurity().getEncryption().getKey();
        boolean isProd = Arrays.stream(environment.getActiveProfiles())
                .anyMatch(p -> p.equalsIgnoreCase("prod") || p.equalsIgnoreCase("production"));

        byte[] primaryKeyBytes = null;

        if (keyConfig != null && !keyConfig.isBlank()) {
            try {
                if (keyConfig.contains("_") || keyConfig.contains("-")) {
                    primaryKeyBytes = Base64.getUrlDecoder().decode(keyConfig.trim());
                } else {
                    primaryKeyBytes = Base64.getDecoder().decode(keyConfig.trim());
                }
            } catch (Exception e) {
                primaryKeyBytes = keyConfig.trim().getBytes(StandardCharsets.UTF_8);
            }
        }

        if (primaryKeyBytes == null || primaryKeyBytes.length != 32) {
            if (isProd) {
                throw new IllegalStateException("CRITICAL: APP_ENCRYPTION_KEY must be a valid 256-bit (32-byte) Base64 string in production!");
            }
            log.warn("[ShortenerCrypto] Master encryption key is missing or not 32 bytes in non-prod environment. Using normalized 256-bit key.");
            byte[] normalized = new byte[32];
            if (primaryKeyBytes != null && primaryKeyBytes.length > 0) {
                System.arraycopy(primaryKeyBytes, 0, normalized, 0, Math.min(primaryKeyBytes.length, 32));
            } else {
                new SecureRandom().nextBytes(normalized);
            }
            primaryKeyBytes = normalized;
        }

        keysByVersion.put(CURRENT_KEY_VERSION, new SecretKeySpec(primaryKeyBytes, ALGORITHM));
        log.info("[ShortenerCrypto] Initialized AES-256-GCM engine with primary key version={}", CURRENT_KEY_VERSION);
    }

    /**
     * Registers an additional key version for rotation scenarios.
     */
    public void registerKeyVersion(String version, byte[] keyBytes) {
        if (keyBytes == null || keyBytes.length != 32) {
            throw new IllegalArgumentException("Key for version " + version + " must be exactly 32 bytes (256 bits).");
        }
        keysByVersion.put(version, new SecretKeySpec(keyBytes, ALGORITHM));
        log.info("[ShortenerCrypto] Registered rotation key version={}", version);
    }

    /**
     * Encrypts plaintext using AES-256-GCM.
     * Output format: "v1:<base64(12-byte IV + ciphertext + 16-byte GCM tag)>"
     */
    public String encrypt(String plainText) {
        if (plainText == null) {
            return null;
        }
        try {
            SecretKey key = keysByVersion.get(CURRENT_KEY_VERSION);
            if (key == null) {
                throw new IllegalStateException("Active encryption key version " + CURRENT_KEY_VERSION + " not found!");
            }

            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, key, parameterSpec);

            byte[] cipherTextBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            ByteBuffer buffer = ByteBuffer.allocate(iv.length + cipherTextBytes.length);
            buffer.put(iv);
            buffer.put(cipherTextBytes);

            return CURRENT_KEY_VERSION + ":" + Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            log.error("[ShortenerCrypto] Encryption failed: {}", e.getMessage());
            throw new RuntimeException("Encryption error occurred", e);
        }
    }

    /**
     * Decrypts ciphertext with version dispatch.
     * Transparently supports:
     * 1. Versioned ciphertext: "v1:<base64(IV + cipher)>"
     * 2. Unencrypted legacy plaintext (e.g. existing "https://...", plain text tags/labels)
     */
    public String decrypt(String storedValue) {
        if (storedValue == null) {
            return null;
        }

        // Fast-path: Check if value is formatted as encrypted payload (e.g. "v1:<base64>")
        boolean isVersionedCipher = storedValue.matches("^v[0-9]+:[A-Za-z0-9+/=_-]+$");
        if (!isVersionedCipher) {
            // Not encrypted or legacy plaintext value; return directly without error
            return storedValue;
        }

        int colonIdx = storedValue.indexOf(':');
        String version = storedValue.substring(0, colonIdx);
        String cipherPayload = storedValue.substring(colonIdx + 1);

        SecretKey key = keysByVersion.get(version);
        if (key == null) {
            log.warn("[ShortenerCrypto] No encryption key found for version: {}, treating as plaintext fallback", version);
            return storedValue;
        }

        try {
            byte[] encryptedBuffer = Base64.getDecoder().decode(cipherPayload);
            if (encryptedBuffer.length <= GCM_IV_LENGTH) {
                return storedValue;
            }

            ByteBuffer buffer = ByteBuffer.wrap(encryptedBuffer);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);

            byte[] cipherTextBytes = new byte[buffer.remaining()];
            buffer.get(cipherTextBytes);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherTextBytes);
            return new String(plainTextBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("[ShortenerCrypto] Decryption attempt failed for version {}: {}. Returning original value as fallback.", version, e.getMessage());
            return storedValue;
        }
    }
}

