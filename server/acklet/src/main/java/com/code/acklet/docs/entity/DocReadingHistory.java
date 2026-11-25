package com.code.acklet.docs.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "doc_reading_history", uniqueConstraints = {
    @UniqueConstraint(name = "uq_doc_reading_history", columnNames = {"user_id", "document_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocReadingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private DocDocument document;

    @Column(name = "last_read_at", nullable = false)
    private Instant lastReadAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        lastReadAt = Instant.now();
    }
}
