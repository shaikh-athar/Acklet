package com.code.acklet.auth.repository;

import com.code.acklet.auth.entity.SecurityAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityAuditLogRepository extends JpaRepository<SecurityAuditLog, UUID> {

    List<SecurityAuditLog> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);

    Page<SecurityAuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
