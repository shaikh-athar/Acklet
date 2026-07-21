package com.code.acklet.tool.repository;

import com.code.acklet.tool.entity.Capability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CapabilityRepository extends JpaRepository<Capability, UUID> {
    List<Capability> findByToolId(UUID toolId);
    void deleteByToolId(UUID toolId);
}
