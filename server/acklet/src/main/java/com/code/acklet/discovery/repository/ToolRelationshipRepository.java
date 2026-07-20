package com.code.acklet.discovery.repository;

import com.code.acklet.discovery.entity.ToolRelationship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ToolRelationshipRepository extends JpaRepository<ToolRelationship, UUID> {
    List<ToolRelationship> findBySourceToolIdAndRelationshipType(UUID sourceToolId, String relationshipType);
    List<ToolRelationship> findBySourceToolId(UUID sourceToolId);
}
