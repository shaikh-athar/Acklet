package com.code.acklet.feedback.repository;

import com.code.acklet.feedback.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    Page<Feedback> findByUserId(UUID userId, Pageable pageable);

    Page<Feedback> findByToolId(String toolId, Pageable pageable);

    Page<Feedback> findByCategory(String category, Pageable pageable);

    Page<Feedback> findByStatus(String status, Pageable pageable);

    Page<Feedback> findBySource(String source, Pageable pageable);

    @Query("SELECT f FROM Feedback f WHERE " +
           "(:toolId IS NULL OR LOWER(f.toolId) = LOWER(:toolId)) AND " +
           "(:category IS NULL OR LOWER(f.category) = LOWER(:category)) AND " +
           "(:status IS NULL OR LOWER(f.status) = LOWER(:status)) AND " +
           "(:source IS NULL OR LOWER(f.source) = LOWER(:source)) AND " +
           "(:search IS NULL OR LOWER(f.message) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(f.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(f.toolName) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Feedback> searchFeedback(
            @Param("toolId") String toolId,
            @Param("category") String category,
            @Param("status") String status,
            @Param("source") String source,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT COUNT(f) FROM Feedback f WHERE f.status = 'NEW'")
    long countNewFeedback();

    @Query("SELECT f.toolId, COUNT(f) FROM Feedback f GROUP BY f.toolId")
    java.util.List<Object[]> countFeedbackByTool();
}
