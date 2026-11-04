package com.code.acklet.tool.tools.barcode.security;

import java.util.Map;

/**
 * Canonical user-friendly error messages and code mappings for Barcode Temporary Codes.
 * Strictly adheres to plain copy guidelines: no technical terms, no stack traces,
 * no exclamation marks, and short literal messages.
 */
public final class TempCodeMessageCatalog {

    private TempCodeMessageCatalog() {}

    public static final String SERVER_ERROR = "SERVER_ERROR";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String NO_PERMISSION = "NO_PERMISSION";
    public static final String RATE_LIMITED = "RATE_LIMITED";
    public static final String EXPIRY_INVALID = "EXPIRY_INVALID";
    public static final String CONTENT_INVALID = "CONTENT_INVALID";
    public static final String FORMAT_INVALID = "FORMAT_INVALID";
    public static final String MAX_ACTIVE_REACHED = "MAX_ACTIVE_REACHED";
    public static final String ALREADY_REPORTED = "ALREADY_REPORTED";

    private static final Map<String, String> FRIENDLY_MESSAGES = Map.of(
            SERVER_ERROR, "Something went wrong. Try again later.",
            NOT_FOUND, "This code was not found.",
            NO_PERMISSION, "You do not have permission to modify this code.",
            RATE_LIMITED, "Too many checks. Try again in a minute.",
            EXPIRY_INVALID, "Choose an expiration time between 1 minute and 365 days from now.",
            CONTENT_INVALID, "The entered content is invalid or unsupported.",
            FORMAT_INVALID, "The payload cannot be encoded in the selected barcode format.",
            MAX_ACTIVE_REACHED, "Maximum active codes limit reached (200). Please delete or expire older codes.",
            ALREADY_REPORTED, "You have already submitted a report for this code today."
    );

    public static String getFriendlyMessage(String code) {
        return FRIENDLY_MESSAGES.getOrDefault(code, "Something went wrong. Try again later.");
    }
}

