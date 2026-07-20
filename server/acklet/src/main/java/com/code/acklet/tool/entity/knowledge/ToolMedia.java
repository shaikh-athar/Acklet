package com.code.acklet.tool.entity.knowledge;

import com.code.acklet.tool.entity.Tool;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "tool_media")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", nullable = false)
    private Tool tool;

    @Column(name = "media_type", length = 50)
    @Builder.Default
    private String mediaType = "SCREENSHOT";

    @Column(nullable = false, length = 500)
    private String url;

    private String caption;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 1;
}
