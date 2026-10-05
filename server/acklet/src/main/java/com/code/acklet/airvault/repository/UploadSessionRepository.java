package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UploadSessionRepository extends JpaRepository<UploadSession, UUID> {

    Optional<UploadSession> findByFileId(String fileId);

    java.util.List<UploadSession> findAllByClipboardId(String clipboardId);

    java.util.List<UploadSession> findAllByCreatedAtBefore(java.time.Instant cutoff);

    @Query("SELECT COALESCE(SUM(s.receivedBytes), 0) FROM UploadSession s WHERE s.clipboardId = :clipboardId AND s.status IN ('PENDING', 'UPLOADING')")
    Long sumActiveUploadsSizeByClipboardId(@Param("clipboardId") String clipboardId);

    java.util.List<UploadSession> findAllByClipboardIdAndBatchId(String clipboardId, String batchId);

    void deleteAllByClipboardId(String clipboardId);
}
