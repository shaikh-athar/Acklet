package com.code.acklet.tool.tools.qr.util;

import java.security.SecureRandom;
import java.util.regex.Pattern;

public final class Base62 {

    private static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int BASE = ALPHABET.length();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{3,32}$");

    private Base62() {}

    public static String randomSlug(int length) {
        if (length < 3) length = 6;
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(ALPHABET.charAt(RANDOM.nextInt(BASE)));
        }
        return sb.toString();
    }

    public static boolean isValidSlug(String slug) {
        if (slug == null) return false;
        return SLUG_PATTERN.matcher(slug).matches();
    }
}
