package com.code.acklet.airvault.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AirVaultAuditEventDto {

    @JsonProperty("event_id")
    private UUID eventId;

    @JsonProperty("timestamp_utc")
    private Instant timestampUtc;

    @JsonProperty("event_type")
    private String eventType;

    @JsonProperty("actor_identity_id")
    private UUID actorIdentityId;

    @JsonProperty("actor_username")
    private String actorUsername;

    @JsonProperty("device_id")
    private String deviceId;

    @JsonProperty("ip_address")
    private String ipAddress;

    @JsonProperty("target_resource_id")
    private String targetResourceId;

    @JsonProperty("result")
    private String result; // "SUCCESS" or "FAILURE"

    @JsonProperty("before_value")
    private String beforeValue;

    @JsonProperty("after_value")
    private String afterValue;

    @JsonProperty("metadata")
    private Map<String, Object> metadata;
}
