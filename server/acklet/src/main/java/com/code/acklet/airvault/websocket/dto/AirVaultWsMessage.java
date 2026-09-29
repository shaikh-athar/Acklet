package com.code.acklet.airvault.websocket.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AirVaultWsMessage {

    /**
     * Message category / protocol frame type:
     * CONNECT_ACK, PING, PONG, SIGNAL, PRESENCE, ERROR
     */
    private String type;

    /**
     * Unique message identifier
     */
    private String messageId;

    /**
     * Device identifier of the message originator
     */
    private String senderDeviceId;

    /**
     * Target device identifier, or "broadcast" / null for all eligible peers
     */
    private String targetDeviceId;

    /**
     * Optional scoped clipboard identifier for room-based routing
     */
    private String clipboardId;

    /**
     * Opaque encrypted payload (zero-knowledge preserved)
     */
    private String payload;

    /**
     * Server or client Unix epoch timestamp in milliseconds
     */
    private Long timestamp;

    /**
     * Optional contextual metadata (e.g. session information, reason codes)
     */
    private Map<String, Object> metadata;
}
