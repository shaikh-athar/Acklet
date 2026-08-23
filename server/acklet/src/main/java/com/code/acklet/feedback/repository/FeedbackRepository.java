package com.code.acklet.feedback.repository;

import com.code.acklet.feedback.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    Page<Feedback> findByToolId(String toolId, Pageable pageable);

    Page<Feedback> findByCategory(String category, Pageable pageable);
}
