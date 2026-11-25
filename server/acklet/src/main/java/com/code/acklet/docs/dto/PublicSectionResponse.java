package com.code.acklet.docs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicSectionResponse {
    private String heading;
    private String body;
    private int position;
}
