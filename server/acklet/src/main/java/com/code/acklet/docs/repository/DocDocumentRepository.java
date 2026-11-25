package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocDocumentRepository extends JpaRepository<DocDocument, UUID>, JpaSpecificationExecutor<DocDocument> {

    List<DocDocument> findByToolIdAndOwnerIdOrderByUpdatedAtDesc(UUID toolId, UUID ownerId);

    List<DocDocument> findByToolIdOrderByUpdatedAtDesc(UUID toolId);

    List<DocDocument> findByOwnerIdOrderByUpdatedAtDesc(UUID ownerId);

    List<DocDocument> findByOwnerIdAndStatusOrderByPublishedAtDesc(UUID ownerId, com.code.acklet.docs.entity.DocStatus status);

    Optional<DocDocument> findByIdAndOwnerId(UUID id, UUID ownerId);

    Optional<DocDocument> findBySlugAndStatus(String slug, com.code.acklet.docs.entity.DocStatus status);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    Optional<DocDocument> findByToolIdAndSlugAndStatus(UUID toolId, String slug, com.code.acklet.docs.entity.DocStatus status);

    boolean existsByToolIdAndSlugAndIdNot(UUID toolId, String slug, UUID id);

    boolean existsByToolIdAndSlug(UUID toolId, String slug);

    long countByToolId(UUID toolId);

    @Query("SELECT d FROM DocDocument d LEFT JOIN FETCH d.sections WHERE d.id = :id")
    Optional<DocDocument> findByIdWithSections(@Param("id") UUID id);
}
