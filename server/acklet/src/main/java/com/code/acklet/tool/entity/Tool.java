package com.code.acklet.tool.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "tools")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tool extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    private String description;

    @Builder.Default
    private String version = "1.0.0";

    private String url;

    private String icon;

    private String author;

    @Column(name = "usage_count")
    @Builder.Default
    private long usageCount = 0;

    @Column(name = "is_featured")
    @Builder.Default
    private boolean isFeatured = false;

    @Column(name = "is_trending")
    @Builder.Default
    private boolean isTrending = false;
}
