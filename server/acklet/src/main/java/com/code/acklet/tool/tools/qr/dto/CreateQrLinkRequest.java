package com.code.acklet.tool.tools.qr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQrLinkRequest {

    /**
     * Type: URL, TEXT, VCARD, OTHER
     */
    private String type;

    @NotBlank(message = "Payload must not be blank")
    private String payload;

    private String mime;
}
