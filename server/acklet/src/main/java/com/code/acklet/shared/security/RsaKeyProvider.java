package com.code.acklet.shared.security;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

@Slf4j
@Getter
@Component
public class RsaKeyProvider {

    private final String keyId;
    private final RSAPublicKey publicKey;
    private final RSAPrivateKey privateKey;

    public RsaKeyProvider() {
        this.keyId = UUID.randomUUID().toString().substring(0, 8);
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
            keyPairGenerator.initialize(2048);
            KeyPair keyPair = keyPairGenerator.generateKeyPair();
            this.publicKey = (RSAPublicKey) keyPair.getPublic();
            this.privateKey = (RSAPrivateKey) keyPair.getPrivate();
            log.info("[RsaKeyProvider] Initialized 2048-bit RSA KeyPair with KeyId: {}", keyId);
        } catch (Exception e) {
            log.error("[RsaKeyProvider] Failed to generate RSA KeyPair", e);
            throw new IllegalStateException("Could not initialize RSA KeyPair", e);
        }
    }
}
