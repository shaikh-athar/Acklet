package com.code.acklet.converter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Utility for packaging converted output files into a single ZIP archive.
 */
@Slf4j
@Component
public class ZipPacker {

    /**
     * Packages all ready files in a batch job into a target zip file path.
     */
    public Path packageZip(Path targetZip, List<FileJobItem> files) throws IOException {
        if (targetZip.getParent() != null) {
            Files.createDirectories(targetZip.getParent());
        }

        try (ZipOutputStream zos = new ZipOutputStream(new BufferedOutputStream(Files.newOutputStream(targetZip)))) {
            for (FileJobItem file : files) {
                if (file.getStatus() == ConversionStatus.COMPLETED && file.getOutputPath() != null && Files.exists(file.getOutputPath())) {
                    String entryName = file.getSanitizedFileName();
                    if (entryName == null || entryName.isBlank()) {
                        entryName = "converted-" + file.getFileId() + "." + file.getTargetFormat();
                    }
                    ZipEntry zipEntry = new ZipEntry(entryName);
                    zos.putNextEntry(zipEntry);
                    try (InputStream is = Files.newInputStream(file.getOutputPath())) {
                        is.transferTo(zos);
                    }
                    zos.closeEntry();
                }
            }
        }
        return targetZip;
    }
}

