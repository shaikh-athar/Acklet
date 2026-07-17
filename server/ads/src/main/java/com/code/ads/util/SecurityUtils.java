package com.code.ads.util;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Utility to identify and filter sensitive files, directories, or patterns
 * to prevent security breaches and accidental leakage of system files/credentials.
 */
public class SecurityUtils {

    // Common directory names to ignore during scans
    private static final Set<String> SENSITIVE_DIRECTORIES = new HashSet<>(Arrays.asList(
        ".git",
        ".github",
        ".agents",
        ".gemini",
        "node_modules",
        ".gradle",
        ".idea",
        ".vscode",
        "build",
        "dist",
        "target",
        "bin",
        "out"
    ));

    // Exact file names to ignore during scans
    private static final Set<String> SENSITIVE_FILE_NAMES = new HashSet<>(Arrays.asList(
        ".gitignore",
        ".gitattributes",
        ".gitmodules",
        ".ds_store",
        "thumbs.db",
        ".env",
        ".env.local",
        ".env.development",
        ".env.production",
        "credentials.json",
        "secrets.json",
        "secrets.yaml",
        "secrets.yml"
    ));

    // File extension patterns to ignore during scans
    private static final List<String> SENSITIVE_EXTENSIONS = Arrays.asList(
        ".pem",
        ".key",
        ".p12",
        ".pfx",
        ".jks",
        ".db",
        ".sqlite",
        ".config"
    );

    /**
     * Checks if a given filename or path is sensitive and should be ignored/filtered out.
     */
    public static boolean isSensitive(String pathOrName) {
        if (pathOrName == null || pathOrName.trim().isEmpty()) {
            return false;
        }

        // Normalize path separators to forward slash and convert to lowercase
        String normalized = pathOrName.replace("\\", "/").toLowerCase();
        
        // Extract filename and path segments
        String[] segments = normalized.split("/");
        String fileName = segments[segments.length - 1];

        // 1. Check if any parent directory segment is sensitive
        for (int i = 0; i < segments.length - 1; i++) {
            if (SENSITIVE_DIRECTORIES.contains(segments[i])) {
                return true;
            }
        }

        // 2. Check if the file name itself is a sensitive directory name (e.g. if checking a directory path)
        if (SENSITIVE_DIRECTORIES.contains(fileName)) {
            return true;
        }

        // 3. Check if the file name matches a sensitive file name exactly
        if (SENSITIVE_FILE_NAMES.contains(fileName)) {
            return true;
        }

        // 4. Check for sensitive extensions
        for (String ext : SENSITIVE_EXTENSIONS) {
            if (fileName.endsWith(ext)) {
                return true;
            }
        }

        // 5. Check if it starts with standard hidden patterns (excluding current and parent dir)
        if (fileName.startsWith(".") && !fileName.equals(".") && !fileName.equals("..")) {
            return true;
        }

        return false;
    }

    /**
     * Filters a list of string paths to remove any sensitive items.
     */
    public static List<String> filterPaths(List<String> paths) {
        if (paths == null) {
            return null;
        }
        return paths.stream()
            .filter(path -> !isSensitive(path))
            .collect(Collectors.toList());
    }
}
