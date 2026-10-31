package com.code.acklet.tool.tools.shortener.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

/**
 * JPA AttributeConverter for URL Shortener confidential fields:
 * - target_url
 * - fallback_url
 * - label
 * - tags
 *
 * Automatically converts plaintext Java entity fields into AES-256-GCM
 * ciphertext upon database persist/update, and transparently decrypts
 * database rows into plaintext when read into entity objects.
 */
@Converter
@Component
public class ShortenerEncryptedStringConverter implements AttributeConverter<String, String> {

    private final ShortenerCryptoService cryptoService;

    public ShortenerEncryptedStringConverter(@Lazy ShortenerCryptoService cryptoService) {
        this.cryptoService = cryptoService;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return cryptoService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        return cryptoService.decrypt(dbData);
    }
}

