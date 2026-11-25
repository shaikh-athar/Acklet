package com.code.acklet.docs.dto;

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
public class BookmarkResponse {
    private UUID id;
    private UUID documentId;
    private String title;
    private String slug;
    private String summary;
    private String authorName;
    private Instant bookmarkedAt;
}
