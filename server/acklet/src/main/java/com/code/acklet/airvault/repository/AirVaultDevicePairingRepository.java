package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultDevice;
import com.code.acklet.airvault.entity.AirVaultDevicePairing;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirVaultDevicePairingRepository extends JpaRepository<AirVaultDevicePairing, UUID> {

    List<AirVaultDevicePairing> findBySourceDeviceAndPairingStateNot(AirVaultDevice sourceDevice, String excludedState);

    List<AirVaultDevicePairing> findBySourceClientDeviceIdAndPairingStateNot(String sourceClientDeviceId, String excludedState);

    Optional<AirVaultDevicePairing> findBySourceClientDeviceIdAndTargetClientDeviceId(String sourceClientDeviceId, String targetClientDeviceId);

    Optional<AirVaultDevicePairing> findBySourceDeviceAndTargetDevice(AirVaultDevice sourceDevice, AirVaultDevice targetDevice);

    @Query("SELECT p FROM AirVaultDevicePairing p WHERE p.sourceClientDeviceId = :clientDeviceId OR p.targetClientDeviceId = :clientDeviceId")
    List<AirVaultDevicePairing> findAllPairingsForClientDevice(@Param("clientDeviceId") String clientDeviceId);

    void deleteBySourceDeviceOrTargetDevice(AirVaultDevice sourceDevice, AirVaultDevice targetDevice);
}
