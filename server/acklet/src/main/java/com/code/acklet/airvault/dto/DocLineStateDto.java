package com.code.acklet.airvault.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Line-level state with tombstone metadata")
public class DocLineStateDto {

    @Schema(description = "Line identifier", example = "line-1")
    private String lineId;

    @Schema(description = "Line text content", example = "Hello World")
    private String content;

    @Schema(description = "Author device or user identifier", example = "dev-k9asf08a")
    private String authorId;

    @Schema(description = "Author display username", example = "@alice")
    private String authorName;

    @Schema(description = "Last sequence number that modified this line", example = "105")
    private Long lastSequence;

    @Schema(description = "Whether the line is currently deleted (tombstone)", example = "false")
    private boolean deleted;

    @Schema(description = "Sequence number at which the line was tombstoned", example = "102")
    private Long deletedAtSequence;

    @Schema(description = "Last edited timestamp in Unix milliseconds", example = "1725700000000")
    private Long lastEditedAt;
}
