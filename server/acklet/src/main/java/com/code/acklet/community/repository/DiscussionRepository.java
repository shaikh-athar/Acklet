package com.code.acklet.community.repository;

import com.code.acklet.community.entity.Discussion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiscussionRepository extends JpaRepository<Discussion, UUID> {
    Optional<Discussion> findBySlug(String slug);
    Page<Discussion> findByIsPinnedTrue(Pageable pageable);
}
