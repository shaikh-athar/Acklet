package com.code.acklet.converter;

import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

/**
 * Validates and parses page range expressions such as "1-3, 5", "2, 4-6", or "all".
 */
public final class PageRangeParser {

    private static final Pattern RANGE_TOKEN_PATTERN = Pattern.compile("^\\s*(\\d+)(?:\\s*-\\s*(\\d+))?\\s*$");

    private PageRangeParser() {}

    /**
     * Checks if a page range expression string is syntactically and logically valid.
     * Empty or blank string is considered valid (signifying all pages).
     */
    public static boolean isValid(String pageRange) {
        if (pageRange == null || pageRange.trim().isEmpty() || "all".equalsIgnoreCase(pageRange.trim())) {
            return true;
        }

        String cleaned = pageRange.trim();
        if (cleaned.endsWith(",") || cleaned.startsWith(",")) {
            return false;
        }

        String[] parts = cleaned.split(",");
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.isEmpty()) {
                return false;
            }
            var matcher = RANGE_TOKEN_PATTERN.matcher(trimmed);
            if (!matcher.matches()) {
                return false;
            }
            try {
                int start = Integer.parseInt(matcher.group(1));
                if (start <= 0) {
                    return false;
                }
                if (matcher.group(2) != null) {
                    int end = Integer.parseInt(matcher.group(2));
                    if (end < start) {
                        return false;
                    }
                }
            } catch (NumberFormatException e) {
                return false;
            }
        }
        return true;
    }

    /**
     * Parses a page range string into an ordered set of 1-based page indices.
     * Throws IllegalArgumentException if the expression is invalid.
     */
    public static Set<Integer> parse(String pageRange) {
        if (pageRange == null || pageRange.trim().isEmpty() || "all".equalsIgnoreCase(pageRange.trim())) {
            return Collections.emptySet();
        }

        if (!isValid(pageRange)) {
            throw new IllegalArgumentException("Invalid page range format: '" + pageRange + "'. Expected format e.g. '1-3, 5'");
        }

        Set<Integer> pages = new TreeSet<>();
        String[] parts = pageRange.trim().split(",");
        for (String part : parts) {
            var matcher = RANGE_TOKEN_PATTERN.matcher(part.trim());
            if (matcher.matches()) {
                int start = Integer.parseInt(matcher.group(1));
                if (matcher.group(2) != null) {
                    int end = Integer.parseInt(matcher.group(2));
                    for (int p = start; p <= end; p++) {
                        pages.add(p);
                    }
                } else {
                    pages.add(start);
                }
            }
        }
        return Collections.unmodifiableSet(pages);
    }

    /**
     * Parses a page range string bounded by maxPages into an ordered list of 1-based page indices.
     */
    public static java.util.List<Integer> parse(String pageRange, int maxPages) {
        Set<Integer> set = parse(pageRange);
        if (set.isEmpty()) {
            java.util.List<Integer> all = new java.util.ArrayList<>();
            for (int i = 1; i <= maxPages; i++) {
                all.add(i);
            }
            return all;
        }
        return set.stream().filter(p -> p <= maxPages).toList();
    }
}

