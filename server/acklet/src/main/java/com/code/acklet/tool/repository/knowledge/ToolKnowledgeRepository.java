package com.code.acklet.tool.repository.knowledge;

import com.code.acklet.tool.entity.knowledge.ToolKnowledge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ToolKnowledgeRepository extends JpaRepository<ToolKnowledge, UUID> {
}
