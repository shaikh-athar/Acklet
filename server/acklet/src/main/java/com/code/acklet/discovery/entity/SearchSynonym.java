package com.code.acklet.discovery.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "search_synonyms")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SearchSynonym {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String term;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String synonyms;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
