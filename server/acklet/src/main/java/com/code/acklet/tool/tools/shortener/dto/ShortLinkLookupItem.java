package com.code.acklet.tool.tools.shortener.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"ownerToken"})
public class ShortLinkLookupItem {

    private String code;
    private String ownerToken;
}
