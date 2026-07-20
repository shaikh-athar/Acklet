package com.code.acklet.tool.entity.knowledge;

import com.code.acklet.tool.entity.Tool;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tool_version_history")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ToolVersionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tool_id", nullable = false)
    private Tool tool;

    @Column(nullable = false, length = 50)
    private String version;

    @Column(name = "release_date")
    @Builder.Default
    private Instant releaseDate = Instant.now();

    @Column(name = "release_notes", columnDefinition = "TEXT")
    private String releaseNotes;

    @Column(name = "upcoming_features", columnDefinition = "TEXT")
    private String upcomingFeatures;
}
