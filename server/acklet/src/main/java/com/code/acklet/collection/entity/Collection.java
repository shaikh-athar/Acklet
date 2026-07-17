package com.code.acklet.collection.entity;

import com.code.acklet.shared.entity.Auditable;
import com.code.acklet.tool.entity.Tool;
import com.code.acklet.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "collections")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Collection extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "is_public")
    @Builder.Default
    private boolean isPublic = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "collection_tools",
            joinColumns = @JoinColumn(name = "collection_id"),
            inverseJoinColumns = @JoinColumn(name = "tool_id")
    )
    @Builder.Default
    private List<Tool> tools = new ArrayList<>();
}
