package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultUserSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirVaultUserSettingsRepository extends JpaRepository<AirVaultUserSettings, UUID> {
    Optional<AirVaultUserSettings> findByIdentityId(UUID identityId);
    Optional<AirVaultUserSettings> findByUsernameIgnoreCase(String username);
}
