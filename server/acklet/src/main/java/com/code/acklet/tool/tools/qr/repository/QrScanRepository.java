package com.code.acklet.tool.tools.qr.repository;

import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import com.code.acklet.tool.tools.qr.entity.QrScanEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QrScanRepository extends JpaRepository<QrScanEntity, Long> {

    interface AggregateMetric {
        String getKey();
        Long getCount();
    }

    long countByQrCode(QrCodeEntity qrCode);

    @Query("SELECT COUNT(DISTINCT s.visitorHash) FROM QrScanEntity s WHERE s.qrCode = :qrCode")
    long countDistinctVisitorHashByQrCode(@Param("qrCode") QrCodeEntity qrCode);

    @Query("SELECT CAST(FUNCTION('DATE', s.scannedAt) AS string) AS key, COUNT(s) AS count " +
           "FROM QrScanEntity s WHERE s.qrCode = :qrCode GROUP BY FUNCTION('DATE', s.scannedAt) ORDER BY key ASC")
    List<AggregateMetric> findDailyScans(@Param("qrCode") QrCodeEntity qrCode);

    @Query("SELECT COALESCE(s.countryCode, 'Unknown') AS key, COUNT(s) AS count " +
           "FROM QrScanEntity s WHERE s.qrCode = :qrCode GROUP BY s.countryCode ORDER BY count DESC")
    List<AggregateMetric> findCountryScans(@Param("qrCode") QrCodeEntity qrCode);

    @Query("SELECT COALESCE(s.deviceType, 'desktop') AS key, COUNT(s) AS count " +
           "FROM QrScanEntity s WHERE s.qrCode = :qrCode GROUP BY s.deviceType ORDER BY count DESC")
    List<AggregateMetric> findDeviceScans(@Param("qrCode") QrCodeEntity qrCode);

    @Query("SELECT COALESCE(s.os, 'Other') AS key, COUNT(s) AS count " +
           "FROM QrScanEntity s WHERE s.qrCode = :qrCode GROUP BY s.os ORDER BY count DESC")
    List<AggregateMetric> findOsScans(@Param("qrCode") QrCodeEntity qrCode);

    @Query("SELECT COALESCE(s.browser, 'Other') AS key, COUNT(s) AS count " +
           "FROM QrScanEntity s WHERE s.qrCode = :qrCode GROUP BY s.browser ORDER BY count DESC")
    List<AggregateMetric> findBrowserScans(@Param("qrCode") QrCodeEntity qrCode);

    List<QrScanEntity> findByQrCodeOrderByScannedAtDesc(QrCodeEntity qrCode, Pageable pageable);
}
