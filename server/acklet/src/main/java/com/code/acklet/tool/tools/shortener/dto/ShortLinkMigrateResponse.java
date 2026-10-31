package com.code.acklet.tool.tools.shortener.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShortLinkMigrateResponse {

    private int migratedCount;
    private Map<String, String> codeMapping;
    private List<ShortLinkItemDto> migratedLinks;
}
