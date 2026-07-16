package com.code.acklet.tool.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToolResponse {
    private UUID id;
    private UUID categoryId;
    private String categoryName;
    private String name;
    private String slug;
    private String description;
    private String version;
    private String url;
    private String icon;
    private String author;
    private long usageCount;
    private boolean isFeatured;
    private boolean isTrending;
}
