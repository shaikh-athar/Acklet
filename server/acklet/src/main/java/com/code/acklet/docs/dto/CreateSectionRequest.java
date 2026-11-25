package com.code.acklet.docs.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSectionRequest {

    @Size(max = 255, message = "Heading cannot exceed 255 characters")
    private String heading;

    @Size(max = 65536, message = "Body cannot exceed 65536 characters")
    private String body;

    private Integer position;
}
