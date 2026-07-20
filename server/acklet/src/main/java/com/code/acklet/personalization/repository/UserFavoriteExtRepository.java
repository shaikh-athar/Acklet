package com.code.acklet.personalization.repository;

import com.code.acklet.personalization.entity.UserFavoriteExt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserFavoriteExtRepository extends JpaRepository<UserFavoriteExt, UUID> {

    List<UserFavoriteExt> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<UserFavoriteExt> findByUserIdAndEntityTypeOrderByCreatedAtDesc(UUID userId, String entityType);

    Optional<UserFavoriteExt> findByUserIdAndEntityTypeAndEntityId(UUID userId, String entityType, String entityId);

    boolean existsByUserIdAndEntityTypeAndEntityId(UUID userId, String entityType, String entityId);

    @Modifying
    @Query("DELETE FROM UserFavoriteExt f WHERE f.user.id = :userId AND f.entityType = :entityType AND f.entityId = :entityId")
    void deleteByUserIdAndEntityTypeAndEntityId(UUID userId, String entityType, String entityId);

    @Modifying
    @Query("DELETE FROM UserFavoriteExt f WHERE f.user.id = :userId")
    void deleteAllByUserId(UUID userId);
}
