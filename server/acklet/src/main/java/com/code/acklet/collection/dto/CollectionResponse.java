package com.code.acklet.collection.dto;

import com.code.acklet.tool.dto.ToolResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CollectionResponse {
    private UUID id;
    private UUID userId;
    private String name;
    private String description;
    private boolean isPublic;
    private List<ToolResponse> tools;
}
