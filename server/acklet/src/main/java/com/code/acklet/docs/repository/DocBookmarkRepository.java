package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocBookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocBookmarkRepository extends JpaRepository<DocBookmark, UUID> {
    boolean existsByUserIdAndDocumentId(UUID userId, UUID documentId);
    Optional<DocBookmark> findByUserIdAndDocumentId(UUID userId, UUID documentId);
    Page<DocBookmark> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    void deleteByUserIdAndDocumentId(UUID userId, UUID documentId);
}
