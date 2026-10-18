package com.code.acklet.tool.tools.clipboard.util;

import java.util.Set;
import java.util.regex.Pattern;

public final class ClipboardSecurityUtil {

    private ClipboardSecurityUtil() {}

    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x1F\\x7F]");
    private static final Pattern PATH_TRAVERSAL = Pattern.compile("(\\.\\.[\\/\\\\]|[\\/\\\\])");

    private static final Set<String> DANGEROUS_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "sh", "com", "msi", "dll", "vbs", "ps1", "scr", "jar", "app"
    );

    /**
     * Sanitizes a user-supplied filename to prevent path traversal, control character injection,
     * or hidden directory escape.
     */
    public static String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file_" + System.currentTimeMillis();
        }

        // Strip path directories if provided (e.g. ../../../etc/passwd -> passwd)
        String clean = filename.trim();
        int lastSlash = Math.max(clean.lastIndexOf('/'), clean.lastIndexOf('\\'));
        if (lastSlash >= 0 && lastSlash < clean.length() - 1) {
            clean = clean.substring(lastSlash + 1);
        }

        // Remove path traversal and control characters
        clean = PATH_TRAVERSAL.matcher(clean).replaceAll("");
        clean = CONTROL_CHARS.matcher(clean).replaceAll("");
        clean = clean.trim();

        if (clean.isEmpty() || clean.equals(".") || clean.equals("..")) {
            clean = "file_" + System.currentTimeMillis();
        }

        // Cap filename length to 200 characters to prevent filesystem truncation errors
        if (clean.length() > 200) {
            int extIdx = clean.lastIndexOf('.');
            String ext = (extIdx > 0 && extIdx < clean.length()) ? clean.substring(extIdx) : "";
            int maxBaseLen = 200 - ext.length();
            if (maxBaseLen > 0) {
                clean = clean.substring(0, maxBaseLen) + ext;
            } else {
                clean = clean.substring(0, 200);
            }
        }

        return clean;
    }

    /**
     * Checks if the filename has an executable or hazardous extension.
     */
    public static boolean isDangerousExtension(String filename) {
        if (filename == null || filename.isBlank()) return false;
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot >= filename.length() - 1) return false;
        String ext = filename.substring(dot + 1).toLowerCase().trim();
        return DANGEROUS_EXTENSIONS.contains(ext);
    }
}
