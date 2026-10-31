package com.code.acklet.tool.tools.shortener.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkActionRequest {

    @NotEmpty(message = "Codes list cannot be empty")
    private List<String> codes;
}

