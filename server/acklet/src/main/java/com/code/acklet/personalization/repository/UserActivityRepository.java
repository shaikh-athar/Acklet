package com.code.acklet.personalization.repository;

import com.code.acklet.personalization.entity.UserActivity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface UserActivityRepository extends JpaRepository<UserActivity, UUID> {

    List<UserActivity> findByUserIdAndEntityTypeOrderByAccessedAtDesc(UUID userId, String entityType, Pageable pageable);

    List<UserActivity> findByUserIdOrderByAccessedAtDesc(UUID userId, Pageable pageable);

    List<UserActivity> findByUserIdAndAccessedAtAfter(UUID userId, Instant since);

    @Modifying
    @Query("DELETE FROM UserActivity a WHERE a.user.id = :userId")
    void deleteAllByUserId(UUID userId);
}
