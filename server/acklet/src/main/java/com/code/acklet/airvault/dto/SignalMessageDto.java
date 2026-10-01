package com.code.acklet.airvault.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SignalMessageDto {

    @NotBlank(message = "senderDeviceId is required")
    private String senderDeviceId;

    @NotBlank(message = "targetDeviceId is required")
    private String targetDeviceId;

    /** One of: OFFER, ANSWER, ICE_CANDIDATE, SYNC_PACKET */
    @NotBlank(message = "signalType is required")
    private String signalType;

    /** Serialized SDP or ICE candidate JSON / encrypted payload */
    @NotBlank(message = "payload is required")
    private String payload;

    private String id;
    private Instant timestamp;

    /** Optional lightweight metadata for notifications & push tiering without full payload decrypt */
    private Long byteSize;
    private String category;
    private Boolean isSensitive;
    private String pairingId;
    private String sessionId;
}
