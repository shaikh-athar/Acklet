package com.code.acklet.tool.tools.qr.repository;

import com.code.acklet.tool.tools.qr.entity.QrLinkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QrLinkRepository extends JpaRepository<QrLinkEntity, UUID> {

    Optional<QrLinkEntity> findByCode(String code);

    boolean existsByCode(String code);

    List<QrLinkEntity> findByCodeIn(Collection<String> codes);

    List<QrLinkEntity> findByExpiresAtBeforeOrStatus(Instant expiresBefore, String status);

    List<QrLinkEntity> findByIsDownloadedFalseAndScanCountAndCreatedAtBefore(Long scanCount, Instant createdBefore);

    @Modifying
    @Query("DELETE FROM QrLinkEntity q WHERE q.expiresAt < :now OR q.status = :expiredStatus")
    int deleteExpiredLinks(@Param("now") Instant now, @Param("expiredStatus") String expiredStatus);

    @Modifying
    @Query("DELETE FROM QrLinkEntity q WHERE q.isDownloaded = false AND q.scanCount = 0 AND q.createdAt < :cutoff")
    int deleteOrphanLinks(@Param("cutoff") Instant cutoff);
}
