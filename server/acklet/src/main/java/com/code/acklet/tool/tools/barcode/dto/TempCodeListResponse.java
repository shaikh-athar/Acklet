package com.code.acklet.tool.tools.barcode.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TempCodeListResponse {

    private List<TempCodeResponse> items;
    private long total;
    private int page;
    private int size;
}

