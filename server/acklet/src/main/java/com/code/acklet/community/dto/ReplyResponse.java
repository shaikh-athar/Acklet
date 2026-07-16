package com.code.acklet.community.dto;

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
public class ReplyResponse {
    private UUID id;
    private UUID discussionId;
    private String authorName;
    private String authorAvatarUrl;
    private String content;
    private UUID parentReplyId;
    private Instant createdAt;
}
