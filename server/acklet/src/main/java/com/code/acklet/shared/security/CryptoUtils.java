package com.code.acklet.shared.security;

import com.code.acklet.config.properties.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Component
public class CryptoUtils {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 12 bytes standard for GCM
    private static final int GCM_TAG_LENGTH = 128; // 128 bits standard authentication tag length

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public CryptoUtils(AppProperties appProperties) {
        String keyBase64 = appProperties.getSecurity().getEncryption().getKey();
        if (keyBase64 == null || keyBase64.isBlank()) {
            throw new IllegalArgumentException("App encryption key is not configured in app.security.encryption.key!");
        }
        byte[] keyBytes = Base64.getDecoder().decode(keyBase64.trim());
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException("AES GCM requires a 256-bit key (32 bytes). Current key length is: " + keyBytes.length + " bytes");
        }
        this.secretKey = new SecretKeySpec(keyBytes, ALGORITHM);
    }

    public String encrypt(String plainText) {
        if (plainText == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherTextBytes = cipher.doFinal(plainText.getBytes());

            // Prefix ciphertext with IV: [IV (12 bytes)][Ciphertext]
            byte[] encryptedBuffer = ByteBuffer.allocate(iv.length + cipherTextBytes.length)
                    .put(iv)
                    .put(cipherTextBytes)
                    .array();

            return Base64.getEncoder().encodeToString(encryptedBuffer);
        } catch (Exception e) {
            log.error("Failed to encrypt data:", e);
            throw new RuntimeException("Encryption error occurred", e);
        }
    }

    public String decrypt(String cipherText) {
        if (cipherText == null) {
            return null;
        }
        try {
            byte[] encryptedBuffer = Base64.getDecoder().decode(cipherText);

            if (encryptedBuffer.length <= GCM_IV_LENGTH) {
                throw new IllegalArgumentException("Encrypted content is too short to extract IV");
            }

            ByteBuffer byteBuffer = ByteBuffer.wrap(encryptedBuffer);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);

            byte[] cipherTextBytes = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherTextBytes);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherTextBytes);
            return new String(plainTextBytes);
        } catch (Exception e) {
            log.error("Failed to decrypt data:", e);
            throw new RuntimeException("Decryption error occurred", e);
        }
    }
}
