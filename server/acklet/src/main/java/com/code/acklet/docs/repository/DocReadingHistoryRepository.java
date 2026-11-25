package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocReadingHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocReadingHistoryRepository extends JpaRepository<DocReadingHistory, UUID> {
    Optional<DocReadingHistory> findByUserIdAndDocumentId(UUID userId, UUID documentId);
    Page<DocReadingHistory> findByUserIdOrderByLastReadAtDesc(UUID userId, Pageable pageable);
    void deleteByUserId(UUID userId);
}
