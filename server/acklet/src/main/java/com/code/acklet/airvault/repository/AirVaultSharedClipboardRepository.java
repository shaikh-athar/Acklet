package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultSharedClipboard;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AirVaultSharedClipboardRepository extends JpaRepository<AirVaultSharedClipboard, String> {
    Optional<AirVaultSharedClipboard> findByIdAndDeletedAtIsNull(String id);
    Optional<AirVaultSharedClipboard> findByOwnerUsernameAndDeletedAtIsNull(String ownerUsername);
    Optional<AirVaultSharedClipboard> findByOwnerDeviceIdAndDeletedAtIsNull(String ownerDeviceId);
    Optional<AirVaultSharedClipboard> findByOwnerIdentityIdAndDeletedAtIsNull(java.util.UUID ownerIdentityId);
    Optional<AirVaultSharedClipboard> findFirstByOwnerIdentityIdAndIsPersonalTrueAndDeletedAtIsNull(java.util.UUID ownerIdentityId);
    Optional<AirVaultSharedClipboard> findFirstByOwnerUsernameIgnoreCaseAndIsPersonalTrueAndDeletedAtIsNull(String ownerUsername);

    long countByOwnerIdentityIdAndDeletedAtIsNull(java.util.UUID ownerIdentityId);
    long countByOwnerUsernameIgnoreCaseAndDeletedAtIsNull(String ownerUsername);

    java.util.List<AirVaultSharedClipboard> findAllByOwnerIdentityIdAndDeletedAtIsNullOrderByCreatedAtDesc(java.util.UUID ownerIdentityId);
    java.util.List<AirVaultSharedClipboard> findAllByOwnerUsernameIgnoreCaseAndDeletedAtIsNullOrderByCreatedAtDesc(String ownerUsername);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM AirVaultSharedClipboard c WHERE c.id = :id AND c.deletedAt IS NULL")
    Optional<AirVaultSharedClipboard> findByIdForUpdate(@Param("id") String id);
}
