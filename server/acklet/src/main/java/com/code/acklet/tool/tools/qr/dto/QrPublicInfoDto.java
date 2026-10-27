package com.code.acklet.tool.tools.qr.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QrPublicInfoDto {

    private String code;
    private String type;
    private String title;
    private boolean hasPassword;
    private String status;
    private String targetUrl;
    private String contentJson;
    private List<DynamicQrResponse.AssetSummary> assets;
}
