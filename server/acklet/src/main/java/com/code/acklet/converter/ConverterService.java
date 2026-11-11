package com.code.acklet.converter;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Service contract for document conversion operations.
 * Allows switching conversion engines behind a uniform interface.
 */
public interface ConverterService {

    /**
     * Executes a file conversion, synchronously or asynchronously depending on file size and parameters.
     *
     * @param file         the uploaded file to convert
     * @param targetFormat requested output extension (e.g. "pdf", "docx")
     * @param forceAsync   optional override to force background asynchronous execution
     * @return conversion result containing status, job id, and download link (if completed)
     */
    ConversionResult convert(MultipartFile file, String targetFormat, Boolean forceAsync);

    /**
     * Retrieves the current status and metadata of a conversion job.
     *
     * @param jobId unique job identifier
     * @return conversion result metadata
     */
    ConversionResult getJobStatus(String jobId);

    /**
     * Retrieves the binary resource of a completed converted file.
     *
     * @param jobId unique job identifier
     * @return downloadable Spring Resource
     */
    Resource downloadConvertedFile(String jobId);

    /**
     * Resolves the filename for content disposition headers on download.
     *
     * @param jobId unique job identifier
     * @return safe filename including extension
     */
    String getConvertedFileName(String jobId);

    /**
     * Resolves the media type for content type headers on download.
     *
     * @param jobId unique job identifier
     * @return MIME type string
     */
    String getConvertedContentType(String jobId);

    /**
     * Checks if the underlying conversion engine (e.g., LibreOffice daemon) is active and ready.
     *
     * @return true if conversions can be processed, false otherwise
     */
    boolean isAvailable();

    /**
     * Returns all supported source input formats.
     */
    List<ConversionFormat> getSupportedSourceFormats();

    /**
     * Returns valid target formats for a given source extension.
     */
    List<ConversionFormat> getSupportedTargetFormats(String sourceExtension);

    /**
     * Purges expired conversion jobs and temporary files.
     */
    void cleanupOldJobs();
}

