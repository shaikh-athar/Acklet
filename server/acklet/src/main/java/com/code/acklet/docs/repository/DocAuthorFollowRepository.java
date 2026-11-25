package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocAuthorFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocAuthorFollowRepository extends JpaRepository<DocAuthorFollow, UUID> {
    boolean existsByFollowerIdAndAuthorId(UUID followerId, UUID authorId);
    Optional<DocAuthorFollow> findByFollowerIdAndAuthorId(UUID followerId, UUID authorId);
    long countByAuthorId(UUID authorId);
    long countByFollowerId(UUID followerId);
    List<DocAuthorFollow> findByFollowerIdOrderByCreatedAtDesc(UUID followerId);
    List<DocAuthorFollow> findByAuthorId(UUID authorId);
}
