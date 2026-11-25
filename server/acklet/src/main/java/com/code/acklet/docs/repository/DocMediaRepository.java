package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocMediaRepository extends JpaRepository<DocMedia, UUID> {
    List<DocMedia> findByDocumentId(UUID documentId);
    long countByDocumentIdAndMediaType(UUID documentId, String mediaType);
    Optional<DocMedia> findByFilename(String filename);
}
