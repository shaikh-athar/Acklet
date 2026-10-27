package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.config.QrLinkProperties;
import com.code.acklet.tool.tools.qr.config.QrProperties;
import com.code.acklet.tool.tools.qr.dto.CreateQrLinkRequest;
import com.code.acklet.tool.tools.qr.dto.QrLinkResponse;
import com.code.acklet.tool.tools.qr.dto.UpdateQrLinkRequest;
import com.code.acklet.tool.tools.qr.entity.QrLinkEntity;
import com.code.acklet.tool.tools.qr.repository.QrCodeRepository;
import com.code.acklet.tool.tools.qr.repository.QrLinkRepository;
import com.code.acklet.tool.tools.qr.service.QrAnalyticsService;
import com.code.acklet.tool.tools.qr.service.QrLinkService;
import com.code.acklet.tool.tools.qr.service.QrResolutionService;
import com.code.acklet.tool.tools.qr.util.QrHtmlRenderer;
import com.code.acklet.tool.tools.qr.util.QrSecurityUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QrMultilingualMatrixTest {

    @Mock
    private QrLinkRepository qrLinkRepository;

    @Mock
    private QrCodeRepository qrCodeRepository;

    @Mock
    private QrAnalyticsService analyticsService;

    @Mock
    private HttpServletRequest servletRequest;

    private QrLinkProperties properties;
    private QrProperties qrProperties;
    private QrLinkService qrLinkService;
    private QrResolutionService qrResolutionService;

    @BeforeEach
    void setUp() {
        properties = new QrLinkProperties();
        properties.setShortlinkBaseUrl("https://acklet.com/q");
        properties.setDefaultTtlMonths(12);
        properties.setOrphanTtlHours(24);
        properties.setMaxTextChars(5000);
        properties.setMaxOtherBytes(10000);
        properties.setMaxUrlChars(4000);
        properties.setBlockPrivateTargets(false);

        qrLinkService = new QrLinkService(qrLinkRepository, properties);

        qrProperties = new QrProperties();
        qrResolutionService = new QrResolutionService(qrCodeRepository, analyticsService, qrProperties, qrLinkService);
    }

    @Test
    @DisplayName("Should accurately store and calculate bytes for Hindi / Devanagari text")
    void testHindiDevanagari() {
        String hindi = "नमस्ते दुनिया! यह एक बहुभाषी क्यूआर कोड परीक्षण है।";
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(hindi)
                .build();

        when(qrLinkRepository.existsByCode(any())).thenReturn(false);
        when(qrLinkRepository.save(any(QrLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getContentBytes()).isEqualTo(hindi.getBytes(StandardCharsets.UTF_8).length);
        assertThat(response.getType()).isEqualTo("TEXT");
    }

    @Test
    @DisplayName("Should accurately store and calculate bytes for Gujarati script")
    void testGujarati() {
        String gujarati = "નમસ્તે દુનિયા! આ એક ગુજરાતી ક્યુઆર કોડ પરીક્ષણ છે.";
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(gujarati)
                .build();

        when(qrLinkRepository.existsByCode(any())).thenReturn(false);
        when(qrLinkRepository.save(any(QrLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getContentBytes()).isEqualTo(gujarati.getBytes(StandardCharsets.UTF_8).length);
    }

    @Test
    @DisplayName("Should accurately store and calculate bytes for Arabic / Urdu RTL script")
    void testArabicRtl() {
        String arabic = "مرحبا بالعالم! هذا اختبار لرمز الاستجابة السريعة متعدد اللغات.";
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(arabic)
                .build();

        when(qrLinkRepository.existsByCode(any())).thenReturn(false);
        when(qrLinkRepository.save(any(QrLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getContentBytes()).isEqualTo(arabic.getBytes(StandardCharsets.UTF_8).length);
    }

    @Test
    @DisplayName("Should accurately store and calculate bytes for Chinese CJK characters")
    void testChineseCjk() {
        String cjk = "你好，世界！这是一个多语言二维码测试。";
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(cjk)
                .build();

        when(qrLinkRepository.existsByCode(any())).thenReturn(false);
        when(qrLinkRepository.save(any(QrLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getContentBytes()).isEqualTo(cjk.getBytes(StandardCharsets.UTF_8).length);
    }

    @Test
    @DisplayName("Should accurately store multi-byte emoji with surrogate pairs")
    void testEmoji() {
        String emojiText = "🚀🌍🎉✨🔥 Quick Response QR Code with Emojis! 🥳🎈";
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(emojiText)
                .build();

        when(qrLinkRepository.existsByCode(any())).thenReturn(false);
        when(qrLinkRepository.save(any(QrLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");

        assertThat(response).isNotNull();
        assertThat(response.getContentBytes()).isEqualTo(emojiText.getBytes(StandardCharsets.UTF_8).length);
    }

    @Test
    @DisplayName("Should normalize decomposed unicode characters into NFC format")
    void testNfcNormalization() {
        // Decomposed 'e' + combining acute accent (\u0301) -> 2 code points
        String decomposed = "Cafe\u0301";
        // Pre-composed 'é' (\u00E9) -> 1 code point
        String composed = "Caf\u00E9";

        String normalized = QrSecurityUtil.normalizeNfc(decomposed);
        assertThat(normalized).isEqualTo(composed);
        assertThat(Normalizer.isNormalized(normalized, Normalizer.Form.NFC)).isTrue();
    }

    @Test
    @DisplayName("Should reject plain text exceeding 5,000 characters")
    void testExceeding5000Chars() {
        String overLimit = "a".repeat(5001);
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(overLimit)
                .build();

        assertThatThrownBy(() -> qrLinkService.createLink(request, "127.0.0.1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds maximum limit of 5000 characters");
    }

    @Test
    @DisplayName("Should accept plain text with exactly 5,000 characters")
    void testExactly5000Chars() {
        String exactLimit = "x".repeat(5000);
        CreateQrLinkRequest request = CreateQrLinkRequest.builder()
                .type("TEXT")
                .payload(exactLimit)
                .build();

        when(qrLinkRepository.existsByCode(any())).thenReturn(false);
        when(qrLinkRepository.save(any(QrLinkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        QrLinkResponse response = qrLinkService.createLink(request, "127.0.0.1");
        assertThat(response).isNotNull();
        assertThat(response.getContentBytes()).isEqualTo(5000L);
    }

    @Test
    @DisplayName("Should render text viewer HTML with UTF-8 meta, dir=auto, and multilingual font stack")
    void testTextViewerHtmlRendering() {
        String arabicText = "مرحبا بك";
        String html = QrHtmlRenderer.renderTextViewer(arabicText, "abc1234");

        assertThat(html).contains("<meta charset=\"UTF-8\">");
        assertThat(html).contains("dir=\"auto\"");
        assertThat(html).contains("Noto Sans Devanagari");
        assertThat(html).contains("Noto Sans Gujarati");
        assertThat(html).contains("Noto Sans Arabic");
        assertThat(html).contains("Noto Sans SC");
        assertThat(html).contains("Noto Color Emoji");
        assertThat(html).contains("\\uFEFF"); // UTF-8 BOM download
    }

    @Test
    @DisplayName("Should update dynamic destination payload without altering short code or URL")
    void testDestinationPayloadUpdate() {
        String rawToken = "my-secret-token";
        String tokenHash = QrSecurityUtil.sha256(rawToken);

        QrLinkEntity entity = QrLinkEntity.builder()
                .id(UUID.randomUUID())
                .code("codeXYZ")
                .type("URL")
                .payload("https://original.com")
                .manageTokenHash(tokenHash)
                .status("ACTIVE")
                .scanCount(10L)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(qrLinkRepository.findByCode("codeXYZ")).thenReturn(Optional.of(entity));

        UpdateQrLinkRequest updateReq = UpdateQrLinkRequest.builder()
                .payload("https://updated-multilingual-destination.com/hi?lang=hi")
                .build();

        QrLinkResponse updateRes = qrLinkService.updateLink("codeXYZ", updateReq, rawToken);

        assertThat(updateRes.getCode()).isEqualTo("codeXYZ");
        assertThat(updateRes.getShortUrl()).isEqualTo("https://acklet.com/q/codeXYZ");
        assertThat(entity.getPayload()).isEqualTo("https://updated-multilingual-destination.com/hi?lang=hi");
    }

    @Test
    @DisplayName("Should return 410 Gone for disabled links and 404 for missing codes")
    void testStatusResponses() {
        QrLinkEntity disabledEntity = QrLinkEntity.builder()
                .code("disabledCode")
                .type("TEXT")
                .payload("Some text")
                .status("DISABLED")
                .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        when(qrLinkRepository.findByCode("disabledCode")).thenReturn(Optional.empty()); // legacy lookup
        when(qrLinkService.findByCode("disabledCode")).thenReturn(Optional.of(disabledEntity));

        ResponseEntity<?> disabledRes = qrResolutionService.resolveShortlink("disabledCode", servletRequest);
        assertThat(disabledRes.getStatusCode()).isEqualTo(HttpStatus.GONE);
        assertThat(disabledRes.getBody().toString()).contains("Link Disabled");

        when(qrLinkRepository.findByCode("missingCode")).thenReturn(Optional.empty());
        when(qrLinkService.findByCode("missingCode")).thenReturn(Optional.empty());
        ResponseEntity<?> missingRes = qrResolutionService.resolveShortlink("missingCode", servletRequest);
        assertThat(missingRes.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(missingRes.getBody().toString()).contains("Not Found");
    }
}
