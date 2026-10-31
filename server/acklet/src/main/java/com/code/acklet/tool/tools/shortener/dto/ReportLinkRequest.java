package com.code.acklet.tool.tools.shortener.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"comment"})
public class ReportLinkRequest {

    @NotBlank(message = "Reason is required")
    @Size(max = 64, message = "Reason cannot exceed 64 characters")
    private String reason;

    @Size(max = 500, message = "Comment cannot exceed 500 characters")
    private String comment;
}

