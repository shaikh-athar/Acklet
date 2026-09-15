package com.code.acklet.airvault.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "airvault_identities")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AirVaultIdentity extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "username", length = 60, nullable = false, unique = true)
    private String username;

    @Column(name = "pin_hash", length = 120, nullable = false)
    private String pinHash;

    @Column(name = "is_customized", nullable = false)
    @Builder.Default
    private Boolean isCustomized = false;

    @OneToMany(mappedBy = "identity", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<AirVaultDevice> devices = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paired_identity_id")
    private AirVaultIdentity pairedIdentity;
}
