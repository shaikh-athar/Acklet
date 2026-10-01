package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.ClipboardFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClipboardFileRepository extends JpaRepository<ClipboardFile, UUID> {

    List<ClipboardFile> findAllByClipboardIdOrderByCreatedAtDesc(String clipboardId);

    List<ClipboardFile> findAllByClipboardId(String clipboardId);

    Optional<ClipboardFile> findByFileId(String fileId);

    List<ClipboardFile> findAllByCreatedAtBefore(java.time.Instant cutoff);

    List<ClipboardFile> findByCreatedAtBetweenOrderByCreatedAtDesc(java.time.Instant start, java.time.Instant end);

    List<ClipboardFile> findByCreatedAtAfterOrderByCreatedAtDesc(java.time.Instant start);

    List<ClipboardFile> findAllByOrderByCreatedAtDesc();

    @Query("SELECT COALESCE(SUM(f.byteSize), 0) FROM ClipboardFile f WHERE f.clipboardId = :clipboardId")
    Long sumTotalBytesByClipboardId(@Param("clipboardId") String clipboardId);

    List<ClipboardFile> findAllByClipboardIdAndBatchId(String clipboardId, String batchId);

    void deleteByFileId(String fileId);

    void deleteAllByClipboardId(String clipboardId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE ClipboardFile f SET f.clipboardId = :newId WHERE f.clipboardId = :oldId")
    void updateClipboardId(@Param("oldId") String oldId, @Param("newId") String newId);
}
