package com.code.acklet.converter.queue;

import java.util.Map;

/**
 * Plain user-facing message mappings for conversion errors.
 * Ensures no raw exception stacktraces or internal library names leak to the client.
 */
public final class ConverterErrorMapper {

    private ConverterErrorMapper() {}

    private static final Map<String, String> ERROR_MESSAGES = Map.ofEntries(
            Map.entry("UNSUPPORTED_PAIR", "Conversion from this format to the chosen target is not supported."),
            Map.entry("CORRUPTED_FILE", "This file appears to be damaged or incomplete. Please check the file and try again."),
            Map.entry("ENCRYPTED", "This file is password-protected. Please remove the password and re-upload."),
            Map.entry("ENCRYPTED_FILE", "This file is password-protected. Please remove the password and re-upload."),
            Map.entry("TOO_LARGE", "This file exceeds the size limit for this format."),
            Map.entry("SIGNATURE_MISMATCH", "File format does not match its file extension."),
            Map.entry("TIMEOUT", "Conversion took longer than the time limit. Retrying..."),
            Map.entry("ENGINE_BUSY", "The converter is at capacity. Retrying in a few seconds..."),
            Map.entry("ENGINE_CRASHED", "The converter encountered an unexpected issue and has restarted. Retrying..."),
            Map.entry("TEMP_IO", "Storage write failed. Retrying..."),
            Map.entry("QUEUE_UNAVAILABLE", "Conversion queue is temporarily unavailable. Please try again shortly."),
            Map.entry("OCR_FAILED", "Text could not be extracted from this scanned document."),
            Map.entry("NO_TEXT_FOUND", "No text found. Scanned pages need OCR.")
    );

    public static String toUserMessage(String errorCode) {
        if (errorCode == null) return "An unexpected error occurred during conversion.";
        return ERROR_MESSAGES.getOrDefault(errorCode.toUpperCase(), "An unexpected error occurred during conversion.");
    }

    public static boolean isPermanent(String errorCode) {
        if (errorCode == null) return false;
        return switch (errorCode.toUpperCase()) {
            case "UNSUPPORTED_PAIR", "CORRUPTED_FILE", "ENCRYPTED", "ENCRYPTED_FILE", "TOO_LARGE", "SIGNATURE_MISMATCH", "OCR_FAILED" -> true;
            default -> false;
        };
    }
}
