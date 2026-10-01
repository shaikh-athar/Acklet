package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultClipboardItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirVaultClipboardItemRepository extends JpaRepository<AirVaultClipboardItem, UUID> {

    Optional<AirVaultClipboardItem> findByClipboardIdAndOpId(String clipboardId, String opId);

    List<AirVaultClipboardItem> findByClipboardIdAndDeletedAtIsNullOrderBySeqAsc(String clipboardId);

    List<AirVaultClipboardItem> findByClipboardIdAndDeletedAtIsNullOrderBySeqAsc(String clipboardId, Pageable pageable);

    List<AirVaultClipboardItem> findByClipboardIdAndSeqGreaterThanAndDeletedAtIsNullOrderBySeqAsc(String clipboardId, Long sinceSeq);

    List<AirVaultClipboardItem> findByClipboardIdAndLastChangeSeqGreaterThanOrderByLastChangeSeqAsc(String clipboardId, Long sinceSeq, Pageable pageable);

    List<AirVaultClipboardItem> findByClipboardIdAndLastChangeSeqGreaterThanOrderByLastChangeSeqAsc(String clipboardId, Long sinceSeq);

    Optional<AirVaultClipboardItem> findByIdAndClipboardIdAndDeletedAtIsNull(UUID id, String clipboardId);

    long countByClipboardIdAndDeletedAtIsNull(String clipboardId);
}
