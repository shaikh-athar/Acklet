package com.code.acklet.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionInfoResponse {

    private UUID id;
    private String deviceName;
    private String ipAddress;
    private String location;
    private Instant lastUsedAt;
    private Instant createdAt;
    private boolean isCurrentSession;
}
