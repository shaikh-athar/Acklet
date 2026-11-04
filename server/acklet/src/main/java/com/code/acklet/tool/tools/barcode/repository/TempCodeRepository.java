package com.code.acklet.tool.tools.barcode.repository;

import com.code.acklet.tool.tools.barcode.entity.TempCodeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TempCodeRepository extends JpaRepository<TempCodeEntity, UUID> {

    Optional<TempCodeEntity> findByTokenHash(String tokenHash);

    Optional<TempCodeEntity> findByIdAndOwnerTokenHash(UUID id, String ownerTokenHash);

    java.util.List<TempCodeEntity> findByOwnerTokenHashAndBatchId(String ownerTokenHash, UUID batchId);

    java.util.List<TempCodeEntity> findByOwnerTokenHashAndIdempotencyKey(String ownerTokenHash, String idempotencyKey);

    @Modifying
    @Query("DELETE FROM TempCodeEntity t WHERE t.ownerTokenHash = :ownerTokenHash AND t.batchId = :batchId")
    int deleteByOwnerTokenHashAndBatchId(@Param("ownerTokenHash") String ownerTokenHash, @Param("batchId") UUID batchId);

    @Query("SELECT COUNT(t) FROM TempCodeEntity t WHERE t.ownerTokenHash = :ownerTokenHash AND t.status = 'ACTIVE' AND t.expiresAt > :now AND t.deletedAt IS NULL")
    long countActiveByOwnerTokenHash(@Param("ownerTokenHash") String ownerTokenHash, @Param("now") Instant now);

    @Query("SELECT t FROM TempCodeEntity t WHERE t.ownerTokenHash = :ownerTokenHash AND t.deletedAt IS NULL " +
           "AND (:status IS NULL OR :status = 'ALL' OR " +
           "    (:status = 'ACTIVE' AND t.status = 'ACTIVE' AND t.expiresAt > :now) OR " +
           "    (:status = 'EXPIRED' AND (t.status = 'EXPIRED' OR (t.status = 'ACTIVE' AND t.expiresAt <= :now))) OR " +
           "    (:status = 'DEACTIVATED' AND t.status = 'DEACTIVATED'))")
    Page<TempCodeEntity> findByOwnerWithoutSearch(
            @Param("ownerTokenHash") String ownerTokenHash,
            @Param("status") String status,
            @Param("now") Instant now,
            Pageable pageable
    );

    @Query("SELECT t FROM TempCodeEntity t WHERE t.ownerTokenHash = :ownerTokenHash AND t.deletedAt IS NULL " +
           "AND LOWER(t.name) LIKE :searchPattern " +
           "AND (:status IS NULL OR :status = 'ALL' OR " +
           "    (:status = 'ACTIVE' AND t.status = 'ACTIVE' AND t.expiresAt > :now) OR " +
           "    (:status = 'EXPIRED' AND (t.status = 'EXPIRED' OR (t.status = 'ACTIVE' AND t.expiresAt <= :now))) OR " +
           "    (:status = 'DEACTIVATED' AND t.status = 'DEACTIVATED'))")
    Page<TempCodeEntity> findByOwnerWithSearch(
            @Param("ownerTokenHash") String ownerTokenHash,
            @Param("searchPattern") String searchPattern,
            @Param("status") String status,
            @Param("now") Instant now,
            Pageable pageable
    );

    default Page<TempCodeEntity> findByOwnerWithFilters(
            String ownerTokenHash,
            String search,
            String status,
            Instant now,
            Pageable pageable
    ) {
        String effectiveStatus = (status == null || status.isBlank()) ? "ALL" : status.trim().toUpperCase(java.util.Locale.ROOT);
        if (search == null || search.isBlank()) {
            return findByOwnerWithoutSearch(ownerTokenHash, effectiveStatus, now, pageable);
        } else {
            String pattern = "%" + search.trim().toLowerCase(java.util.Locale.ROOT) + "%";
            return findByOwnerWithSearch(ownerTokenHash, pattern, effectiveStatus, now, pageable);
        }
    }

    @Modifying
    @Query("DELETE FROM TempCodeEntity t WHERE t.purgeAt <= :now OR t.deletedAt IS NOT NULL")
    int purgeExpiredOrDeletedBefore(@Param("now") Instant now);
}

