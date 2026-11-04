package com.code.acklet.tool.tools.barcode.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTempCodeRequest {

    @NotBlank(message = "Reason is required")
    @Size(max = 64, message = "Reason cannot exceed 64 characters")
    private String reason;

    @Size(max = 500, message = "Comment cannot exceed 500 characters")
    private String comment;
}

