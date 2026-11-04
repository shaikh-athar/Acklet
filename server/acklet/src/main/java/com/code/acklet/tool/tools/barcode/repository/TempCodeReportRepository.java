package com.code.acklet.tool.tools.barcode.repository;

import com.code.acklet.tool.tools.barcode.entity.TempCodeReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface TempCodeReportRepository extends JpaRepository<TempCodeReportEntity, UUID> {

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END FROM TempCodeReportEntity r " +
           "WHERE r.codeId = :codeId AND r.reporterIpHash = :reporterIpHash AND r.createdAt >= :since")
    boolean existsByCodeIdAndReporterIpHashSince(
            @Param("codeId") UUID codeId,
            @Param("reporterIpHash") String reporterIpHash,
            @Param("since") Instant since
    );
}

