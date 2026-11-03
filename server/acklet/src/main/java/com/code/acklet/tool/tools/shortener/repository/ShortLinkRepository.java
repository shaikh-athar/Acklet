package com.code.acklet.tool.tools.shortener.repository;

import com.code.acklet.tool.tools.shortener.entity.ShortLinkEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
public interface ShortLinkRepository extends JpaRepository<ShortLinkEntity, UUID> {

    Optional<ShortLinkEntity> findByCode(String code);

    boolean existsByCode(String code);

    Page<ShortLinkEntity> findByOwnerTokenHashAndDeletedAtIsNull(String ownerTokenHash, Pageable pageable);

    List<ShortLinkEntity> findByCodeIn(Collection<String> codes);

    /**
     * Atomic click increment for standard links.
     */
    @Modifying
    @Query("UPDATE ShortLinkEntity s SET s.clicks = s.clicks + 1, s.lastOpenedAt = :now WHERE s.id = :id AND s.isDeactivated = false AND (s.expiresAt IS NULL OR s.expiresAt > :now)")
    int incrementClicksStandard(@Param("id") UUID id, @Param("now") Instant now);

    /**
     * Atomic click increment for links with a maximum click limit.
     */
    @Modifying
    @Query("UPDATE ShortLinkEntity s SET s.clicks = s.clicks + 1, s.lastOpenedAt = :now WHERE s.id = :id AND s.isDeactivated = false AND s.clicks < s.maxClicks AND (s.expiresAt IS NULL OR s.expiresAt > :now)")
    int incrementClicksWithLimit(@Param("id") UUID id, @Param("now") Instant now);

    /**
     * Atomic click increment and deactivation for one-time links.
     */
    @Modifying
    @Query("UPDATE ShortLinkEntity s SET s.clicks = s.clicks + 1, s.isDeactivated = true, s.lastOpenedAt = :now WHERE s.id = :id AND s.isDeactivated = false AND s.clicks = 0 AND (s.expiresAt IS NULL OR s.expiresAt > :now)")
    int consumeOneTimeLink(@Param("id") UUID id, @Param("now") Instant now);

    /**
     * Soft delete link.
     */
    @Modifying
    @Query("UPDATE ShortLinkEntity s SET s.deletedAt = :now WHERE s.id = :id")
    int softDelete(@Param("id") UUID id, @Param("now") Instant now);

    /**
     * Toggle deactivation state.
     */
    @Modifying
    @Query("UPDATE ShortLinkEntity s SET s.isDeactivated = :deactivated WHERE s.id = :id")
    int setDeactivated(@Param("id") UUID id, @Param("deactivated") boolean deactivated);

    /**
     * Purge deleted links past retention cutoff.
     */
    @Modifying
    @Query("DELETE FROM ShortLinkEntity s WHERE s.deletedAt IS NOT NULL AND s.deletedAt < :cutoff")
    int purgeDeletedLinks(@Param("cutoff") Instant cutoff);

    /**
     * Purge expired links past retention cutoff.
     */
    @Modifying
    @Query("DELETE FROM ShortLinkEntity s WHERE s.expiresAt IS NOT NULL AND s.expiresAt < :cutoff")
    int purgeExpiredLinks(@Param("cutoff") Instant cutoff);

    /**
     * Purge limit-reached or consumed one-time links past retention cutoff.
     */
    @Modifying
    @Query("DELETE FROM ShortLinkEntity s WHERE ((s.isOneTime = true AND s.clicks >= 1) OR (s.maxClicks IS NOT NULL AND s.clicks >= s.maxClicks)) AND s.lastOpenedAt IS NOT NULL AND s.lastOpenedAt < :cutoff")
    int purgeLimitReachedLinks(@Param("cutoff") Instant cutoff);
}
