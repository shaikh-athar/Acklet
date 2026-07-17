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
public class DiscussionResponse {
    private UUID id;
    private String title;
    private String content;
    private String slug;
    private boolean isPinned;
    private long viewCount;
    private String authorName;
    private String authorAvatarUrl;
    private Instant createdAt;
}
