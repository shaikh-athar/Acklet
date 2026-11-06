package com.code.acklet.converter;

import com.code.acklet.converter.exception.InvalidFileException;
import com.code.acklet.converter.exception.UnsupportedFormatException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Validates file payloads, verifies MIME types and extensions, and sanitizes filenames.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ConverterValidator {

    private final ConverterProperties properties;

    private static final Pattern ILLEGAL_CHARS = Pattern.compile("[\\\\/:*?\"<>|;`$&]");
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x1F\\x7F]");
    private static final Pattern MULTI_DOTS = Pattern.compile("\\.{2,}");
    private static final int MAX_BASE_NAME_LENGTH = 100;

    /**
     * Validates an incoming conversion request.
     *
     * @param file         the uploaded multipart file
     * @param targetFormat the desired target format string
     * @return the resolved source format
     */
    public ConversionFormat validateRequest(MultipartFile file, String targetFormat) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Uploaded file cannot be null or empty.");
        }

        // 1. File size check
        if (file.getSize() > properties.getMaxFileSizeBytes()) {
            throw new InvalidFileException(String.format(
                    "File size (%d bytes) exceeds the configured maximum allowed size (%d bytes).",
                    file.getSize(), properties.getMaxFileSizeBytes()));
        }

        // 2. Filename validation & extension extraction
        String originalName = file.getOriginalFilename();
        if (originalName == null || originalName.isBlank()) {
            throw new InvalidFileException("Uploaded file must have a valid filename with an extension.");
        }

        String sanitized = sanitizeFilename(originalName);
        String extension = extractExtension(sanitized);
        if (extension.isBlank()) {
            throw new InvalidFileException("Uploaded file must have an extension (e.g., .docx, .xlsx, .pdf).");
        }

        // 3. Source format check
        ConversionFormat sourceFormat = ConversionFormat.fromExtension(extension)
                .orElseThrow(() -> new UnsupportedFormatException(
                        String.format("Unsupported source file format: '.%s'.", extension)));

        // 4. Target format check
        if (targetFormat == null || targetFormat.isBlank()) {
            throw new UnsupportedFormatException("Target format must be specified.");
        }

        ConversionFormat resolvedTarget = ConversionFormat.fromExtension(targetFormat)
                .orElseThrow(() -> new UnsupportedFormatException(
                        String.format("Unsupported target format: '%s'.", targetFormat)));

        if (!ConversionFormat.isConversionSupported(sourceFormat, resolvedTarget)) {
            throw new UnsupportedFormatException(String.format(
                    "Conversion from '%s' to '%s' is not supported. Supported targets: %s",
                    sourceFormat.getExtension(), resolvedTarget.getExtension(),
                    sourceFormat.getTargetExtensions()));
        }

        return sourceFormat;
    }

    /**
     * Sanitizes a filename, preventing path traversal and illegal filesystem characters.
     *
     * @param rawName the raw filename from the client
     * @return safe, sanitized filename
     */
    public String sanitizeFilename(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            return "document";
        }

        // Extract base name only (strip directories if path was sent)
        String name = rawName.trim();
        int lastSlash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
        if (lastSlash >= 0 && lastSlash < name.length() - 1) {
            name = name.substring(lastSlash + 1);
        }

        // Remove control characters and path traversal
        name = CONTROL_CHARS.matcher(name).replaceAll("");
        name = MULTI_DOTS.matcher(name).replaceAll(".");
        name = ILLEGAL_CHARS.matcher(name).replaceAll("_");

        // Split base and extension
        int lastDot = name.lastIndexOf('.');
        String baseName;
        String ext = "";

        if (lastDot >= 0) {
            baseName = name.substring(0, lastDot).trim();
            ext = name.substring(lastDot).trim().toLowerCase(Locale.ROOT);
        } else {
            baseName = name.trim();
        }

        // Strip leading/trailing dots, spaces, and underscores
        while (baseName.startsWith(".") || baseName.startsWith(" ") || baseName.startsWith("_")) {
            baseName = baseName.substring(1);
        }
        while (baseName.endsWith(".") || baseName.endsWith(" ") || baseName.endsWith("_")) {
            baseName = baseName.substring(0, baseName.length() - 1);
        }

        if (baseName.isBlank()) {
            baseName = "document";
        }

        if (baseName.length() > MAX_BASE_NAME_LENGTH) {
            baseName = baseName.substring(0, MAX_BASE_NAME_LENGTH);
        }

        return baseName + ext;
    }

    /**
     * Extracts extension without the leading dot.
     */
    public String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int lastDot = filename.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < filename.length() - 1) {
            return filename.substring(lastDot + 1).toLowerCase(Locale.ROOT);
        }
        return "";
    }
}

