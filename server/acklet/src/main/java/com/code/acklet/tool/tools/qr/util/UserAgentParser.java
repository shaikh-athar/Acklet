package com.code.acklet.tool.tools.qr.util;

public final class UserAgentParser {

    private UserAgentParser() {}

    public record ParsedUserAgent(
            String deviceType,
            String os,
            String browser
    ) {}

    public static ParsedUserAgent parse(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return new ParsedUserAgent("unknown", "unknown", "unknown");
        }

        String ua = userAgent.toLowerCase();

        // Check for common bots/crawlers
        if (ua.contains("bot") || ua.contains("crawl") || ua.contains("spider") || ua.contains("slurp") || ua.contains("preview")) {
            return new ParsedUserAgent("bot", "bot", "bot");
        }

        // Determine OS
        String os = "Other";
        if (ua.contains("ipad") || (ua.contains("macintosh") && ua.contains("mobile"))) {
            os = "iPadOS";
        } else if (ua.contains("iphone") || ua.contains("ipod")) {
            os = "iOS";
        } else if (ua.contains("android")) {
            os = "Android";
        } else if (ua.contains("mac os x") || ua.contains("macintosh")) {
            os = "macOS";
        } else if (ua.contains("windows")) {
            os = "Windows";
        } else if (ua.contains("cros")) {
            os = "ChromeOS";
        } else if (ua.contains("linux")) {
            os = "Linux";
        }

        // Determine Device Type
        String deviceType = "desktop";
        if (ua.contains("tablet") || ua.contains("ipad") || (ua.contains("android") && !ua.contains("mobile"))) {
            deviceType = "tablet";
        } else if (ua.contains("mobile") || ua.contains("iphone") || ua.contains("ipod") || ua.contains("android")) {
            deviceType = "mobile";
        }

        // Determine Browser
        String browser = "Other";
        if (ua.contains("edg/") || ua.contains("edge/")) {
            browser = "Edge";
        } else if (ua.contains("samsungbrowser")) {
            browser = "Samsung Internet";
        } else if (ua.contains("opr/") || ua.contains("opera")) {
            browser = "Opera";
        } else if (ua.contains("chrome") || ua.contains("crios")) {
            browser = "Chrome";
        } else if (ua.contains("firefox") || ua.contains("fxios")) {
            browser = "Firefox";
        } else if (ua.contains("safari") && !ua.contains("chrome")) {
            browser = "Safari";
        }

        return new ParsedUserAgent(deviceType, os, browser);
    }
}
