package com.code.acklet.tool.tools.barcode.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchItemRequest {

    @Size(max = 100, message = "Name cannot exceed 100 characters")
    private String name;

    private String content;

    @Size(max = 64, message = "Reference text cannot exceed 64 characters")
    private String reference;
}

