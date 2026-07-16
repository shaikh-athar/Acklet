package com.code.acklet.community.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class ReplyRequest {
    @NotBlank(message = "Reply content is required")
    private String content;

    private UUID parentReplyId;
}
