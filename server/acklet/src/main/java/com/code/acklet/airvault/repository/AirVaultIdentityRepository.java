package com.code.acklet.airvault.repository;

import com.code.acklet.airvault.entity.AirVaultIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AirVaultIdentityRepository extends JpaRepository<AirVaultIdentity, UUID> {

    Optional<AirVaultIdentity> findByUsername(String username);

    Optional<AirVaultIdentity> findByUsernameIgnoreCase(String username);

    boolean existsByUsername(String username);

    boolean existsByUsernameIgnoreCase(String username);
}
