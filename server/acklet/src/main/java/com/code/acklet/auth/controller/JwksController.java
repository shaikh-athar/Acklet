package com.code.acklet.auth.controller;

import com.code.acklet.shared.security.RsaKeyProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Tag(name = "JWKS Endpoint", description = "Public JSON Web Key Set for RS256 token verification")
public class JwksController {

    private final RsaKeyProvider rsaKeyProvider;

    @GetMapping("/.well-known/jwks.json")
    @Operation(summary = "Get Public JWKS", description = "Returns RSA Public Keys for external services verifying Acklet RS256 JWTs")
    public ResponseEntity<Map<String, Object>> getJwks() {
        RSAPublicKey publicKey = rsaKeyProvider.getPublicKey();
        String n = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.getModulus().toByteArray());
        String e = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.getPublicExponent().toByteArray());

        Map<String, Object> jwk = Map.of(
                "kty", "RSA",
                "alg", "RS256",
                "use", "sig",
                "kid", rsaKeyProvider.getKeyId(),
                "n", n,
                "e", e
        );

        return ResponseEntity.ok(Map.of("keys", List.of(jwk)));
    }
}
