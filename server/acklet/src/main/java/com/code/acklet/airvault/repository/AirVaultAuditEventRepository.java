package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultAuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AirVaultAuditEventRepository extends JpaRepository<AirVaultAuditEvent, UUID> {

    @Query("SELECT e FROM AirVaultAuditEvent e WHERE " +
           "((:actorIdentityId IS NOT NULL AND e.actorIdentityId = :actorIdentityId) OR " +
           "(:actorUsername IS NOT NULL AND LOWER(e.actorUsername) = LOWER(:actorUsername)) OR " +
           "(:deviceId IS NOT NULL AND e.deviceId = :deviceId)) " +
           "AND e.timestampUtc >= :startTime AND e.timestampUtc < :endTime " +
           "ORDER BY e.timestampUtc DESC")
    List<AirVaultAuditEvent> findByActorAndDateRange(
            @Param("actorIdentityId") UUID actorIdentityId,
            @Param("actorUsername") String actorUsername,
            @Param("deviceId") String deviceId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime);

    @Query("SELECT e FROM AirVaultAuditEvent e WHERE " +
           "e.timestampUtc >= :startTime AND e.timestampUtc < :endTime " +
           "ORDER BY e.timestampUtc DESC")
    List<AirVaultAuditEvent> findByDateRange(
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime);

    List<AirVaultAuditEvent> findByTimestampUtcAfterOrderByTimestampUtcDesc(Instant startTime);

    List<AirVaultAuditEvent> findAllByOrderByTimestampUtcDesc();
}
