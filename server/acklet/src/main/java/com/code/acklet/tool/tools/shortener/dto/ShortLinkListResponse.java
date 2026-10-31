package com.code.acklet.tool.tools.shortener.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortLinkListResponse {

    private List<ShortLinkItemDto> items;
    private long total;
    private int page;
    private int size;
}
