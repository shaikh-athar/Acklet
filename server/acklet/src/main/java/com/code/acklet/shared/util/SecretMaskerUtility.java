package com.code.acklet.shared.util;

import java.util.Collection;

public class SecretMaskerUtility {

    private SecretMaskerUtility() {}

    public static String maskSecrets(String logContent, Collection<String> secretValues) {
        if (logContent == null || logContent.isBlank() || secretValues == null || secretValues.isEmpty()) {
            return logContent;
        }

        String sanitized = logContent;
        for (String secret : secretValues) {
            if (secret != null && !secret.isBlank() && secret.length() > 2) {
                sanitized = sanitized.replace(secret, "***MASKED***");
            }
        }
        return sanitized;
    }

    public static boolean isSensitiveKey(String keyName) {
        if (keyName == null) return false;
        String lower = keyName.toLowerCase();
        return lower.contains("secret") ||
               lower.contains("password") ||
               lower.contains("token") ||
               lower.contains("key") ||
               lower.contains("auth") ||
               lower.contains("credentials");
    }
}
