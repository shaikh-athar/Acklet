package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultDevice;
import com.code.acklet.airvault.entity.AirVaultIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirVaultDeviceRepository extends JpaRepository<AirVaultDevice, UUID> {

    List<AirVaultDevice> findByUserIdAndStatusNot(UUID userId, String excludedStatus);

    List<AirVaultDevice> findByIdentity(AirVaultIdentity identity);

    Optional<AirVaultDevice> findByUserIdAndClientDeviceId(UUID userId, String clientDeviceId);

    Optional<AirVaultDevice> findByClientDeviceId(String clientDeviceId);

    Optional<AirVaultDevice> findByUsername(String username);

    boolean existsByUsername(String username);

    long countByUserIdAndStatus(UUID userId, String status);
}
