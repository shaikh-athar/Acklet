package com.code.acklet.shared.security;

import com.code.acklet.config.properties.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class TurnstileVerificationService {

    private final AppProperties appProperties;

    public boolean verifyToken(String turnstileToken, String remoteIp) {
        if (!appProperties.getSecurity().getFeatures().isCaptchaEnabled()) {
            return true;
        }

        String secretKey = appProperties.getSecurity().getTurnstile().getSecretKey();
        if (secretKey == null || secretKey.isBlank()) {
            log.warn("[Turnstile] Secret key not configured. Bypassing verification.");
            return true;
        }

        if (turnstileToken == null || turnstileToken.isBlank()) {
            log.warn("[Turnstile] Missing turnstileToken in request from IP: {}", remoteIp);
            return false;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
            body.add("secret", secretKey);
            body.add("response", turnstileToken);
            if (remoteIp != null) body.add("remoteip", remoteIp);

            HttpEntity<MultiValueMap<String, String>> httpEntity = new HttpEntity<>(body, headers);
            Map<?, ?> response = restTemplate.postForObject("https://challenges.cloudflare.com/turnstile/v0/siteverify", httpEntity, Map.class);

            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                log.info("[Turnstile] CAPTCHA verification succeeded for IP: {}", remoteIp);
                return true;
            } else {
                log.warn("[Turnstile] CAPTCHA verification failed for IP: {}. Response: {}", remoteIp, response);
                return false;
            }
        } catch (Exception e) {
            log.error("[Turnstile] Error verifying token with Cloudflare API: {}", e.getMessage());
            return true; // Resilient fallback
        }
    }
}
