package com.code.acklet.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CryptoUtilsTest {

    private CryptoUtils cryptoUtils;

    @BeforeEach
    void setUp() {
        // Base64 encoded 256-bit AES key for testing
        cryptoUtils = new CryptoUtils("MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=");
    }

    @Test
    void testEncryptDecryptSuccess() {
        String originalText = "SuperSensitiveData123!";
        String encrypted = cryptoUtils.encrypt(originalText);
        
        assertNotNull(encrypted);
        assertNotEquals(originalText, encrypted);

        String decrypted = cryptoUtils.decrypt(encrypted);
        assertEquals(originalText, decrypted);
    }

    @Test
    void testEncryptDecryptNull() {
        assertNull(cryptoUtils.encrypt(null));
        assertNull(cryptoUtils.decrypt(null));
    }

    @Test
    void testGcmIvIsRandom() {
        String secret = "SameTextForBoth";
        String firstEnc = cryptoUtils.encrypt(secret);
        String secondEnc = cryptoUtils.encrypt(secret);

        assertNotNull(firstEnc);
        assertNotNull(secondEnc);
        // GCM must produce different ciphertexts for the same plaintext due to random IVs
        assertNotEquals(firstEnc, secondEnc);
        
        assertEquals(secret, cryptoUtils.decrypt(firstEnc));
        assertEquals(secret, cryptoUtils.decrypt(secondEnc));
    }

    @Test
    void testDecryptThrowsOnMalformedCipher() {
        String malformedCipher = "tooShort";
        assertThrows(RuntimeException.class, () -> cryptoUtils.decrypt(malformedCipher));
    }
}
