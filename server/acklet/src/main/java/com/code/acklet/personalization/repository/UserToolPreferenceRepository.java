package com.code.acklet.personalization.repository;

import com.code.acklet.personalization.entity.UserToolPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserToolPreferenceRepository extends JpaRepository<UserToolPreference, UUID> {

    Optional<UserToolPreference> findByUserIdAndToolSlug(UUID userId, String toolSlug);

    List<UserToolPreference> findByUserId(UUID userId);

    @Modifying
    @Query("DELETE FROM UserToolPreference p WHERE p.user.id = :userId")
    void deleteAllByUserId(UUID userId);
}
