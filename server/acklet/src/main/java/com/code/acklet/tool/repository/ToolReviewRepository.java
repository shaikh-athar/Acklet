package com.code.acklet.tool.repository;

import com.code.acklet.tool.entity.ToolReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ToolReviewRepository extends JpaRepository<ToolReview, UUID> {

    Page<ToolReview> findByToolIdAndDeletedAtIsNull(UUID toolId, Pageable pageable);

    Optional<ToolReview> findByToolIdAndUserId(UUID toolId, UUID userId);

    boolean existsByToolIdAndUserId(UUID toolId, UUID userId);

    @Query("SELECT COALESCE(AVG(r.rating), 0) FROM ToolReview r WHERE r.tool.id = :toolId AND r.deletedAt IS NULL")
    double getAverageRatingByToolId(UUID toolId);

    long countByToolIdAndDeletedAtIsNull(UUID toolId);
}
