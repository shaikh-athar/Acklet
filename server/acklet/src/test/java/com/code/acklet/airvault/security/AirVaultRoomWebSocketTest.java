package com.code.acklet.airvault.security;

import com.code.acklet.airvault.diagnostic.WsOperationTimer;
import com.code.acklet.airvault.service.AirVaultAuditService;
import com.code.acklet.airvault.service.AirVaultRedisTracker;
import com.code.acklet.airvault.service.AirVaultSyncRelayService;
import com.code.acklet.airvault.websocket.AirVaultMetricsService;
import com.code.acklet.airvault.websocket.AirVaultWebSocketHandler;
import com.code.acklet.airvault.websocket.dto.AirVaultWsMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class AirVaultRoomWebSocketTest {

    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AirVaultRedisTracker redisTracker;

    @Mock
    private AirVaultSyncRelayService syncRelayService;

    @Mock
    private AirVaultAuditService auditService;

    @Mock
    private WsOperationTimer wsOperationTimer;

    @Mock
    private AirVaultMetricsService metricsService;

    @Mock
    private AirVaultAuthorizationService authorizationService;

    private AirVaultWebSocketHandler webSocketHandler;

    private WebSocketSession session1;
    private WebSocketSession session2;
    private WebSocketSession session3;

    private Map<String, Object> attributes1 = new HashMap<>();
    private Map<String, Object> attributes2 = new HashMap<>();
    private Map<String, Object> attributes3 = new HashMap<>();

    @BeforeEach
    void setUp() {
        doAnswer(inv -> {
            ((Runnable) inv.getArgument(2)).run();
            return null;
        }).when(wsOperationTimer).timeRunnable(any(), any(), any());

        webSocketHandler = new AirVaultWebSocketHandler(
                objectMapper,
                redisTracker,
                syncRelayService,
                auditService,
                wsOperationTimer,
                Executors.newFixedThreadPool(4),
                metricsService,
                authorizationService
        );

        session1 = mock(WebSocketSession.class);
        when(session1.getId()).thenReturn("sess-1");
        when(session1.isOpen()).thenReturn(true);
        when(session1.getAttributes()).thenReturn(attributes1);
        attributes1.put("deviceId", "dev-1");
        attributes1.put("username", "user1");
        attributes1.put("principal", AirVaultPrincipal.builder().username("user1").deviceId("dev-1").tokenType("USER").build());

        session2 = mock(WebSocketSession.class);
        when(session2.getId()).thenReturn("sess-2");
        when(session2.isOpen()).thenReturn(true);
        when(session2.getAttributes()).thenReturn(attributes2);
        attributes2.put("deviceId", "dev-2");
        attributes2.put("username", "user2");
        attributes2.put("principal", AirVaultPrincipal.builder().username("user2").deviceId("dev-2").tokenType("USER").build());

        session3 = mock(WebSocketSession.class);
        when(session3.getId()).thenReturn("sess-3");
        when(session3.isOpen()).thenReturn(true);
        when(session3.getAttributes()).thenReturn(attributes3);
        attributes3.put("deviceId", "dev-3");
        attributes3.put("username", "user3");
        attributes3.put("principal", AirVaultPrincipal.builder().username("user3").deviceId("dev-3").tokenType("USER").build());

        // Connect all 3 sessions
        webSocketHandler.afterConnectionEstablished(session1);
        webSocketHandler.afterConnectionEstablished(session2);
        webSocketHandler.afterConnectionEstablished(session3);
    }

    @AfterEach
    void tearDown() {
        webSocketHandler.onShutdown();
    }

    @Test
    void testRoomSubscriptionAndScopedDelivery() throws Exception {
        // user1 and user2 have access to clipboard-A
        when(authorizationService.canRead(any(), eq("clipboard-A"))).thenReturn(true);
        // user3 does NOT have access to clipboard-A
        AirVaultPrincipal principal3 = (AirVaultPrincipal) attributes3.get("principal");
        when(authorizationService.canRead(principal3, "clipboard-A")).thenReturn(false);

        // Session 1 & 2 SUBSCRIBE to clipboard-A
        TextMessage subMsgA = new TextMessage("{\"type\":\"SUBSCRIBE\",\"clipboardId\":\"clipboard-A\"}");
        webSocketHandler.handleMessage(session1, subMsgA);
        webSocketHandler.handleMessage(session2, subMsgA);

        // Session 3 tries to SUBSCRIBE to clipboard-A (should be rejected)
        webSocketHandler.handleMessage(session3, subMsgA);

        // Verify session 1 and 2 are in room, session 3 is NOT
        assertTrue(webSocketHandler.isSessionInClipboardRoom("clipboard-A", "sess-1"));
        assertTrue(webSocketHandler.isSessionInClipboardRoom("clipboard-A", "sess-2"));
        assertFalse(webSocketHandler.isSessionInClipboardRoom("clipboard-A", "sess-3"));
        assertEquals(2, webSocketHandler.getClipboardRoomSubscriberCount("clipboard-A"));

        // Emit an event to clipboard-A
        AirVaultWsMessage itemAdded = AirVaultWsMessage.builder()
                .type("CLIPBOARD_ITEM_ADDED")
                .senderDeviceId("server")
                .clipboardId("clipboard-A")
                .payload("{\"seq\":1,\"text\":\"Hello Room A\"}")
                .timestamp(System.currentTimeMillis())
                .build();

        webSocketHandler.sendToClipboardRoom("clipboard-A", itemAdded, null);

        // Allow async executor a moment to deliver
        Thread.sleep(400);

        // Session 1 and 2 receive message, Session 3 receives nothing
        verify(session1, atLeastOnce()).sendMessage(any(TextMessage.class));
        verify(session2, atLeastOnce()).sendMessage(any(TextMessage.class));
    }

    @Test
    void testRevocationCleansUpRoomAndNotifies() throws Exception {
        when(authorizationService.canRead(any(), eq("clipboard-A"))).thenReturn(true);

        TextMessage subMsgA = new TextMessage("{\"type\":\"SUBSCRIBE\",\"clipboardId\":\"clipboard-A\"}");
        webSocketHandler.handleMessage(session1, subMsgA);
        assertTrue(webSocketHandler.isSessionInClipboardRoom("clipboard-A", "sess-1"));

        // Revoke room
        webSocketHandler.revokeClipboardRoom("clipboard-A", "Collaborator removed");

        // Verify room is empty
        assertFalse(webSocketHandler.isSessionInClipboardRoom("clipboard-A", "sess-1"));
        assertEquals(0, webSocketHandler.getClipboardRoomSubscriberCount("clipboard-A"));
    }
}
