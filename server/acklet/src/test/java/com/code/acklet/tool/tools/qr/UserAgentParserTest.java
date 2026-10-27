package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.util.UserAgentParser;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class UserAgentParserTest {

    @Test
    void testIPhoneSafari() {
        String ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
        UserAgentParser.ParsedUserAgent parsed = UserAgentParser.parse(ua);
        assertEquals("mobile", parsed.deviceType());
        assertEquals("iOS", parsed.os());
        assertEquals("Safari", parsed.browser());
    }

    @Test
    void testAndroidChrome() {
        String ua = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
        UserAgentParser.ParsedUserAgent parsed = UserAgentParser.parse(ua);
        assertEquals("mobile", parsed.deviceType());
        assertEquals("Android", parsed.os());
        assertEquals("Chrome", parsed.browser());
    }

    @Test
    void testDesktopMacFirefox() {
        String ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0";
        UserAgentParser.ParsedUserAgent parsed = UserAgentParser.parse(ua);
        assertEquals("desktop", parsed.deviceType());
        assertEquals("macOS", parsed.os());
        assertEquals("Firefox", parsed.browser());
    }

    @Test
    void testBotDetection() {
        String ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
        UserAgentParser.ParsedUserAgent parsed = UserAgentParser.parse(ua);
        assertEquals("bot", parsed.deviceType());
        assertEquals("bot", parsed.os());
        assertEquals("bot", parsed.browser());
    }
}
