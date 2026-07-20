package com.code.acklet.tool.repository.knowledge;

import com.code.acklet.tool.entity.knowledge.ToolVersionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ToolVersionHistoryRepository extends JpaRepository<ToolVersionHistory, UUID> {
    List<ToolVersionHistory> findByToolIdOrderByReleaseDateDesc(UUID toolId);
}
