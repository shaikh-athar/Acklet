package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultStorageCleanupLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirVaultStorageCleanupLogRepository extends JpaRepository<AirVaultStorageCleanupLog, UUID> {

    Optional<AirVaultStorageCleanupLog> findByObjectKeyAndStatus(String objectKey, String status);

    List<AirVaultStorageCleanupLog> findAllByCleanupPathAndStatusAndPhase1MarkedAtBefore(
            String cleanupPath,
            String status,
            Instant cutoff
    );

    @Query("SELECT SUM(c.byteSize) FROM AirVaultStorageCleanupLog c WHERE c.status = 'DELETED'")
    Long sumTotalBytesReclaimed();

    @Query("SELECT SUM(c.byteSize) FROM AirVaultStorageCleanupLog c WHERE c.status = 'DELETED' AND c.cleanupPath = :cleanupPath")
    Long sumBytesReclaimedByPath(@Param("cleanupPath") String cleanupPath);
}
