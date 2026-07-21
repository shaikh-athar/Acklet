package com.code.acklet.tool.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class ToolReviewRequest {

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Short rating;

    @Size(max = 200, message = "Title must be at most 200 characters")
    private String title;

    @NotBlank(message = "Review body is required")
    private String body;

    private String useCase;
    private List<String> pros;
    private List<String> cons;
}
