package com.code.acklet.tool.tools.shortener.repository;

import com.code.acklet.tool.tools.shortener.entity.ShortLinkReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface ShortLinkReportRepository extends JpaRepository<ShortLinkReportEntity, UUID> {

    @Query("SELECT COUNT(r) > 0 FROM ShortLinkReportEntity r WHERE r.linkId = :linkId AND r.reporterIpHash = :ipHash AND r.createdAt >= :since")
    boolean existsByLinkIdAndReporterIpHashSince(@Param("linkId") UUID linkId,
                                                @Param("ipHash") String ipHash,
                                                @Param("since") Instant since);

    long countByLinkId(UUID linkId);
}

