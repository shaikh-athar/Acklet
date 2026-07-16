package com.code.acklet.auth.repository;

import com.code.acklet.auth.entity.OneTimePassword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OneTimePasswordRepository extends JpaRepository<OneTimePassword, UUID> {
    Optional<OneTimePassword> findByEmailAndCodeAndTypeAndVerifiedFalse(
            String email, String code, OneTimePassword.OtpType type
    );
}
