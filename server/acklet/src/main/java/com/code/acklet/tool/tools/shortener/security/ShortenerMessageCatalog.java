package com.code.acklet.tool.tools.shortener.security;

import java.util.Map;

/**
 * Canonical user-friendly error codes and messages for the Acklet URL Shortener.
 * Single source of truth for safe, non-technical, friendly messaging.
 */
public final class ShortenerMessageCatalog {

    private ShortenerMessageCatalog() {}

    public static final String LINK_INVALID = "LINK_INVALID";
    public static final String LINK_BLOCKED = "LINK_BLOCKED";
    public static final String LINK_TOO_LONG = "LINK_TOO_LONG";
    public static final String NAME_INVALID = "NAME_INVALID";
    public static final String NAME_TAKEN = "NAME_TAKEN";
    public static final String PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT";
    public static final String PASSWORD_WRONG = "PASSWORD_WRONG";
    public static final String RATE_LIMITED = "RATE_LIMITED";
    public static final String LINK_UNAVAILABLE = "LINK_UNAVAILABLE";
    public static final String LINK_EXPIRED = "LINK_EXPIRED";
    public static final String LINK_NOT_ACTIVE_YET = "LINK_NOT_ACTIVE_YET";
    public static final String VISIT_LIMIT_REACHED = "VISIT_LIMIT_REACHED";
    public static final String NO_PERMISSION = "NO_PERMISSION";
    public static final String BACKUP_FILE_INVALID = "BACKUP_FILE_INVALID";
    public static final String SERVER_ERROR = "SERVER_ERROR";
    public static final String OFFLINE_OR_NETWORK = "OFFLINE_OR_NETWORK";
    public static final String ACCESS_EXPIRED = "ACCESS_EXPIRED";
    public static final String REPORT_RECEIVED = "REPORT_RECEIVED";
    public static final String SAVE_FAILED = "SAVE_FAILED";

    private static final Map<String, String> MESSAGES = Map.ofEntries(
            Map.entry(LINK_INVALID, "Enter a valid link that starts with http:// or https://."),
            Map.entry(LINK_BLOCKED, "This link can't be shortened."),
            Map.entry(LINK_TOO_LONG, "That link is too long. Try a shorter one."),
            Map.entry(NAME_INVALID, "Use 3 to 30 letters, numbers, hyphens or underscores."),
            Map.entry(NAME_TAKEN, "That name is already taken. Try another."),
            Map.entry(PASSWORD_TOO_SHORT, "Use at least 6 characters."),
            Map.entry(PASSWORD_WRONG, "That password isn't correct. Try again."),
            Map.entry(RATE_LIMITED, "You're creating links too quickly. Please wait a moment and try again."),
            Map.entry(LINK_UNAVAILABLE, "This link isn't available."),
            Map.entry(LINK_EXPIRED, "This link has expired."),
            Map.entry(LINK_NOT_ACTIVE_YET, "This link isn't active yet. Please check back later."),
            Map.entry(VISIT_LIMIT_REACHED, "This link has reached its visit limit."),
            Map.entry(NO_PERMISSION, "You can only manage links created on this device or restored from a backup."),
            Map.entry(BACKUP_FILE_INVALID, "That file couldn't be read. Choose a backup file downloaded from this tool."),
            Map.entry(SERVER_ERROR, "We couldn't complete that. Please try again in a few minutes."),
            Map.entry(OFFLINE_OR_NETWORK, "You appear to be offline. Check your connection and try again."),
            Map.entry(ACCESS_EXPIRED, "Your access has expired. Enter the password again."),
            Map.entry(REPORT_RECEIVED, "Report received. Thank you."),
            Map.entry(SAVE_FAILED, "Your changes weren't saved. Please try again.")
    );

    public static String getMessage(String code) {
        return MESSAGES.getOrDefault(code, MESSAGES.get(SERVER_ERROR));
    }
}

