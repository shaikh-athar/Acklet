package com.code.acklet.tool.tools.clipboard.repository;

import com.code.acklet.tool.tools.clipboard.entity.ClipboardUploadSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClipboardUploadSessionRepository extends JpaRepository<ClipboardUploadSessionEntity, String> {

    Optional<ClipboardUploadSessionEntity> findByIdAndShare_Code(String id, String shareCode);

    @Query("SELECT s FROM ClipboardUploadSessionEntity s WHERE s.share.code = :shareCode AND s.fileHash = :fileHash AND s.totalSize = :totalSize AND s.status = 'IN_PROGRESS' AND s.expiresAt > :now ORDER BY s.updatedAt DESC")
    List<ClipboardUploadSessionEntity> findActiveResumableSessions(String shareCode, String fileHash, Long totalSize, Instant now);

    List<ClipboardUploadSessionEntity> findByStatusAndExpiresAtBefore(String status, Instant now);

    List<ClipboardUploadSessionEntity> findByShare_Code(String shareCode);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ClipboardUploadSessionEntity s WHERE s.share.code = :shareCode")
    void deleteByShare_Code(String shareCode);
}
