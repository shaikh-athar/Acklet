package com.code.acklet.blog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleResponse {
    private UUID id;
    private String title;
    private String content;
    private String slug;
    private int readingTime;
    private Map<String, Object> seoMetadata;
    private Instant createdAt;
}
