package com.code.acklet.tool.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class UpdateToolRequest {

    @Size(max = 100)
    private String name;

    @Size(max = 300)
    private String tagline;

    private String description;
    private String categorySlug;
    private String websiteUrl;
    private String githubUrl;
    private String logoUrl;
    private String coverUrl;
    private String pricingType;
    private Boolean isOpenSource;
    private List<String> tags;
}
