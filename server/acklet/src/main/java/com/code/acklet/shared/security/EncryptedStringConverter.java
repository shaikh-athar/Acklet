package com.code.acklet.shared.security;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

@Converter
@Component
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private final CryptoUtils cryptoUtils;

    // Lazy load CryptoUtils to prevent eager initialization issues with Hibernate lifecycle
    public EncryptedStringConverter(@Lazy CryptoUtils cryptoUtils) {
        this.cryptoUtils = cryptoUtils;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return cryptoUtils.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        return cryptoUtils.decrypt(dbData);
    }
}
