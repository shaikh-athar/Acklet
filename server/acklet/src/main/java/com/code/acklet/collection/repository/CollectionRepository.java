package com.code.acklet.collection.repository;

import com.code.acklet.collection.entity.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    List<Collection> findByUserId(UUID userId);
    List<Collection> findByIsPublicTrue();
    Optional<Collection> findBySlug(String slug);
    Optional<Collection> findBySlugAndStatus(String slug, Collection.CollectionStatus status);

    Page<Collection> findByUserId(UUID userId, Pageable pageable);
    Page<Collection> findByUserIdAndStatus(UUID userId, Collection.CollectionStatus status, Pageable pageable);
    Page<Collection> findByUserIdAndNameContainingIgnoreCase(UUID userId, String name, Pageable pageable);
    Page<Collection> findByUserIdAndStatusAndNameContainingIgnoreCase(UUID userId, Collection.CollectionStatus status, String name, Pageable pageable);

    Page<Collection> findByStatus(Collection.CollectionStatus status, Pageable pageable);
}
