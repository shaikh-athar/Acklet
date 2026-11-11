package com.code.acklet.converter.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConverterErrorResponse {
    private String code;
    private String message;
    private String fileId;
}

