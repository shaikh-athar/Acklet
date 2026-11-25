package com.code.acklet.docs.repository;

import com.code.acklet.docs.entity.DocNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DocNotificationRepository extends JpaRepository<DocNotification, UUID> {
    Page<DocNotification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    long countByUserIdAndReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE DocNotification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    void markAllAsReadForUser(UUID userId);
}
