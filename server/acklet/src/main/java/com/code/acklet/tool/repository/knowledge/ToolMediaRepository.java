package com.code.acklet.tool.repository.knowledge;

import com.code.acklet.tool.entity.knowledge.ToolMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ToolMediaRepository extends JpaRepository<ToolMedia, UUID> {
    List<ToolMedia> findByToolIdOrderByDisplayOrderAsc(UUID toolId);
}
