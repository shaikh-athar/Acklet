package com.code.acklet.tool.tools.qr.repository;

import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrCodeRepository extends JpaRepository<QrCodeEntity, String> {

    Optional<QrCodeEntity> findByCode(String code);

    Optional<QrCodeEntity> findByManageKeyHash(String manageKeyHash);

    boolean existsByCode(String code);
}
