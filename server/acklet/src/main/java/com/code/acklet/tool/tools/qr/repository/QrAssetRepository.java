package com.code.acklet.tool.tools.qr.repository;

import com.code.acklet.tool.tools.qr.entity.QrAssetEntity;
import com.code.acklet.tool.tools.qr.entity.QrCodeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QrAssetRepository extends JpaRepository<QrAssetEntity, String> {

    List<QrAssetEntity> findByQrCode(QrCodeEntity qrCode);
}
