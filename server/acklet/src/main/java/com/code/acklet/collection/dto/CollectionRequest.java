package com.code.acklet.collection.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CollectionRequest {
    @NotBlank(message = "Collection name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    private String slug;

    private String coverImage;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private String introduction;

    private boolean isPublic;

    private String status;

    private String seoMetadata;

    private List<UUID> toolIds;
}
