package com.code.acklet.discovery.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "homepage_section_configs")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class HomepageSectionConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "section_key", nullable = false, unique = true, length = 50)
    private String sectionKey;

    @Column(nullable = false, length = 100)
    private String title;

    private String subtitle;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 1;

    @Column(name = "is_enabled")
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "item_limit")
    @Builder.Default
    private Integer itemLimit = 6;
}
