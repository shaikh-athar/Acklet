package com.code.acklet.feedback.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackAdminUpdateRequest {

    private String status; // 'NEW', 'REVIEWING', 'PLANNED', 'RESOLVED', 'REJECTED'

    private String adminNotes;

    private String toolId;

    private String toolName;

    private String category;
}
