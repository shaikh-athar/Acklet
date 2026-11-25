package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocSectionRepository extends JpaRepository<DocSection, UUID> {

    List<DocSection> findByDocumentIdOrderByPositionAsc(UUID documentId);

    @Query("SELECT COALESCE(MAX(s.position), -1) FROM DocSection s WHERE s.document.id = :documentId")
    int findMaxPositionByDocumentId(@Param("documentId") UUID documentId);

    long countByDocumentId(UUID documentId);

    Optional<DocSection> findByIdAndDocumentId(UUID id, UUID documentId);
}
