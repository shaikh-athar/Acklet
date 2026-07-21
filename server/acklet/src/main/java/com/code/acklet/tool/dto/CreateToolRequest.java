package com.code.acklet.tool.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateToolRequest {

    @NotBlank(message = "Tool name is required")
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String name;

    /** If not provided, will be auto-generated from name */
    @Size(max = 100, message = "Slug must be at most 100 characters")
    private String slug;

    @Size(max = 300, message = "Tagline must be at most 300 characters")
    private String tagline;

    private String description;

    @NotBlank(message = "Category slug is required")
    private String categorySlug;

    private String websiteUrl;
    private String githubUrl;
    private String logoUrl;
    private String coverUrl;

    private String pricingType = "FREE";
    private boolean isOpenSource = false;

    private List<String> tags;
}
