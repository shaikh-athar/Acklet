package com.code.acklet.airvault.entity;

import com.code.acklet.shared.entity.Auditable;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@Entity
@Table(name = "airvault_clipboard_files")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ClipboardFile extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "clipboard_id", nullable = false, length = 100)
    private String clipboardId;

    @Column(name = "file_id", nullable = false, length = 100)
    private String fileId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "byte_size", nullable = false)
    private Long byteSize;

    @Column(name = "checksum", length = 120)
    private String checksum;

    @Column(name = "storage_path", length = 500)
    private String storagePath;

    @Column(name = "preview_url", columnDefinition = "TEXT")
    private String previewUrl;

    @Column(name = "sender_device_id", length = 100)
    private String senderDeviceId;

    @Column(name = "sender_device_name", length = 120)
    private String senderDeviceName;

    @Column(name = "batch_id", length = 100)
    private String batchId;
}
