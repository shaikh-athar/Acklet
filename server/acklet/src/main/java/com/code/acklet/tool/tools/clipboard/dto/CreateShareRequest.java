package com.code.acklet.tool.tools.clipboard.dto;

import lombok.Data;

@Data
public class CreateShareRequest {
    private Integer expiryHours;
    private String pin;
    private Boolean burnAfterReading;
    private Boolean liveMode;
    private String requestedCode;
}
