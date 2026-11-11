package com.code.acklet.converter;

import com.code.acklet.converter.engine.ConversionEngine;
import com.code.acklet.converter.engine.ConversionEntry;
import com.code.acklet.converter.engine.EngineRegistry;
import com.code.acklet.converter.exception.*;
import com.code.acklet.converter.queue.ConversionMessageProducer;
import com.code.acklet.converter.queue.ConversionTaskMessage;
import com.code.acklet.converter.queue.ConverterErrorMapper;
import com.code.acklet.converter.queue.ConverterQueueConstants;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/**
 * Service orchestrating multi-file batch document conversions, structure inspections,
 * asynchronous queue progression, and ZIP archive packaging.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileConverterJobService {

    private final ConverterProperties properties;
    private final ConverterValidator validator;
    private final StructureAnalyzer structureAnalyzer;
    private final ZipPacker zipPacker;
    private final FileConverterEngine converterEngine;
    private final EngineRegistry engineRegistry;

    @Autowired(required = false)
    private ConversionMessageProducer messageProducer;

    private final Map<String, BatchJob> activeJobs = new ConcurrentHashMap<>();
    private final Map<String, List<SseEmitter>> sseEmitters = new ConcurrentHashMap<>();
    private ExecutorService jobExecutor;

    @PostConstruct
    public void init() {
        this.jobExecutor = Executors.newFixedThreadPool(
                Math.max(2, Runtime.getRuntime().availableProcessors()),
                new ThreadFactory() {
                    private int count = 1;
                    @Override
                    public Thread newThread(Runnable r) {
                        Thread t = new Thread(r, "acklet-batch-worker-" + count++);
                        t.setDaemon(true);
                        return t;
                    }
                }
        );
        log.info("Initialized FileConverterJobService with TTL {}m and storage {}",
                properties.getJobTtlMinutes(), properties.resolveTempDirectory());
    }

    @PreDestroy
    public void shutdown() {
        if (jobExecutor != null) {
            jobExecutor.shutdown();
            try {
                if (!jobExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                    jobExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                jobExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }

    /**
     * Creates and enqueues a new multi-file batch conversion job.
     */
    public BatchJob createJob(MultipartFile[] files, ConversionOptions options) {
        if (files == null || files.length == 0) {
            throw new InvalidFileException("No files were uploaded for conversion.");
        }
        if (files.length > properties.getMaxFileCount()) {
            throw new InvalidFileException(String.format("Batch exceeds limit of %d files (received %d).",
                    properties.getMaxFileCount(), files.length));
        }

        ConversionOptions effectiveOptions = options != null ? options : new ConversionOptions();
        String globalTarget = (effectiveOptions.getTargetFormat() != null && !effectiveOptions.getTargetFormat().isBlank())
                ? effectiveOptions.getTargetFormat().toLowerCase().trim()
                : "pdf";

        // Validate page range format if provided
        if (effectiveOptions.getPageRange() != null && !effectiveOptions.getPageRange().isBlank()) {
            if (!PageRangeParser.isValid(effectiveOptions.getPageRange())) {
                throw new InvalidFileException("Invalid page range: '" + effectiveOptions.getPageRange() + "'. Format e.g. '1-3, 5'.");
            }
        }

        // Validate all input file pairs against tested entries in registry before staging
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            String rawName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
            String sanitized = validator.sanitizeFilename(rawName);
            String ext = validator.extractExtension(sanitized);

            List<String> testedTargets = engineRegistry.getTestedEntriesForInput(ext)
                    .stream()
                    .map(com.code.acklet.converter.engine.ConversionEntry::getOutputType)
                    .distinct()
                    .toList();

            if (!testedTargets.contains(globalTarget)) {
                throw new UnsupportedFormatException(ext, globalTarget, null, testedTargets);
            }
        }

        String jobId = UUID.randomUUID().toString();
        Path jobDir = properties.resolveTempDirectory().resolve("batch-" + jobId);
        try {
            Files.createDirectories(jobDir);
        } catch (IOException e) {
            throw new ConversionFailedException("Could not initialize batch storage directory", e);
        }

        List<FileJobItem> jobFiles = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            ConversionFormat sourceFormat = validator.validateRequest(file, globalTarget);
            String rawName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document." + sourceFormat.getExtension();
            String sanitized = validator.sanitizeFilename(rawName);
            String fileId = UUID.randomUUID().toString().substring(0, 8);

            Path sourcePath = jobDir.resolve("in-" + fileId + "-" + sanitized);
            try {
                file.transferTo(sourcePath);
            } catch (IOException e) {
                throw new ConversionFailedException("Failed to stage uploaded file: " + rawName, e);
            }

            // Perform structural analysis on input file
            byte[] previewBytes;
            try {
                previewBytes = Files.readAllBytes(sourcePath);
            } catch (IOException e) {
                previewBytes = new byte[0];
            }
            // Perform signature and security check
            validator.validateSignatureAndEncryption(previewBytes, sourceFormat.getExtension());

            StructureReport report = structureAnalyzer.analyze(previewBytes, sanitized, sourceFormat.getExtension());

            String baseName = sanitized.contains(".") ? sanitized.substring(0, sanitized.lastIndexOf('.')) : sanitized;
            String outFileName = baseName + "." + globalTarget;
            Path outputPath = jobDir.resolve("out-" + fileId + "-" + outFileName);

            var entryOpt = engineRegistry != null ? engineRegistry.findEntry(sourceFormat.getExtension(), globalTarget) : Optional.<ConversionEntry>empty();
            String tier = entryOpt.isPresent() && entryOpt.get().getTier() != null ? entryOpt.get().getTier() : "stable";
            String runtime = entryOpt.isPresent() && entryOpt.get().getRuntime() != null ? entryOpt.get().getRuntime() : "server";

            FileJobItem item = FileJobItem.builder()
                    .fileId(fileId)
                    .originalFileName(rawName)
                    .sanitizedFileName(outFileName)
                    .sourceFormat(sourceFormat.getExtension())
                    .targetFormat(globalTarget)
                    .sizeBytes(file.getSize())
                    .status(ConversionStatus.PENDING)
                    .progress(0)
                    .attempts(1)
                    .tier(tier)
                    .runtime(runtime)
                    .downloadUrl("/api/file-converter/jobs/" + jobId + "/files/" + fileId)
                    .structureReport(report)
                    .fidelityLevel(report != null ? report.getFidelityLevel() : "high")
                    .fidelityReasons(report != null ? report.getFidelityReasons() : new ArrayList<>())
                    .sourcePath(sourcePath)
                    .outputPath(outputPath)
                    .build();

            jobFiles.add(item);
        }

        if (jobFiles.isEmpty()) {
            throw new InvalidFileException("All uploaded files were empty or invalid.");
        }

        BatchJob batchJob = BatchJob.builder()
                .jobId(jobId)
                .status(ConversionStatus.PROCESSING)
                .progress(0)
                .files(jobFiles)
                .options(effectiveOptions)
                .zipDownloadUrl("/api/file-converter/jobs/" + jobId + "/zip")
                .createdAt(Instant.now())
                .directoryPath(jobDir)
                .build();

        activeJobs.put(jobId, batchJob);

        // Dispatch via RabbitMQ if available, otherwise graceful dev fallback
        boolean dispatchedToRabbit = false;
        if (messageProducer != null) {
            // Backpressure check: if office queue depth > 20, throttle with 503
            for (FileJobItem item : jobFiles) {
                String queue = resolveQueueForPair(item.getSourceFormat(), item.getTargetFormat());
                if (ConverterQueueConstants.QUEUE_OFFICE.equals(queue)) {
                    int depth = messageProducer.getQueueDepth(ConverterQueueConstants.QUEUE_OFFICE);
                    if (depth > 20) {
                        log.warn("Office conversion queue depth ({}) exceeded threshold (20), triggering backpressure", depth);
                        throw new QueueUnavailableException("QUEUE_UNAVAILABLE", "Conversion queue is full. Please try again in 30 seconds.");
                    }
                }
            }

            boolean allConfirmed = true;
            for (FileJobItem item : jobFiles) {
                String queue = resolveQueueForPair(item.getSourceFormat(), item.getTargetFormat());
                ConversionTaskMessage taskMessage = ConversionTaskMessage.builder()
                        .jobId(jobId)
                        .fileId(item.getFileId())
                        .inputType(item.getSourceFormat())
                        .outputType(item.getTargetFormat())
                        .options(effectiveOptions)
                        .queue(queue)
                        .attempt(1)
                        .build();

                boolean confirmed = messageProducer.publishTask(taskMessage);
                if (!confirmed) {
                    allConfirmed = false;
                    break;
                }
            }
            if (allConfirmed) {
                dispatchedToRabbit = true;
                log.info("Batch job {} queued across RabbitMQ queues", jobId);
            } else if (!properties.isDevFallback()) {
                throw new QueueUnavailableException("QUEUE_UNAVAILABLE", "Conversion queue is temporarily unavailable. Please try again shortly.");
            }
        }

        if (!dispatchedToRabbit) {
            jobExecutor.submit(() -> executeBatch(batchJob));
        }

        broadcastJobUpdate(batchJob);
        return batchJob;
    }

    /**
     * Executes conversion sequentially or concurrently across items in a batch.
     */
    private void executeBatch(BatchJob batchJob) {
        log.info("Starting batch conversion job {} ({} files, target: {})",
                batchJob.getJobId(), batchJob.getFiles().size(), batchJob.getOptions().getTargetFormat());

        int total = batchJob.getFiles().size();
        int completed = 0;

        for (int i = 0; i < total; i++) {
            FileJobItem item = batchJob.getFiles().get(i);
            item.setStatus(ConversionStatus.PROCESSING);
            item.setProgress(20);

            try {
                ConversionEngine engine = engineRegistry != null
                        ? engineRegistry.findEngineFor(item.getSourceFormat(), item.getTargetFormat())
                        : null;

                if (engine != null) {
                    engine.convert(
                            item.getSourcePath(),
                            item.getOutputPath(),
                            item.getSourceFormat(),
                            item.getTargetFormat(),
                            batchJob.getOptions(),
                            percent -> item.setProgress(percent)
                    );
                } else {
                    item.setProgress(50);
                    converterEngine.convert(
                            item.getSourcePath(),
                            item.getOutputPath(),
                            item.getTargetFormat(),
                            batchJob.getOptions()
                    );
                }

                if (Files.exists(item.getOutputPath())) {
                    item.setConvertedSizeBytes(Files.size(item.getOutputPath()));
                }
                item.setProgress(100);
                item.setStatus(ConversionStatus.COMPLETED);
                completed++;
            } catch (Exception e) {
                log.error("Conversion failed for file in batch {}: {}", batchJob.getJobId(), e.getMessage());
                item.setStatus(ConversionStatus.FAILED);
                item.setErrorMessage("Conversion failed: " + e.getMessage());
            }

            int overallProgress = (int) (((double) (i + 1) / total) * 100);
            batchJob.setProgress(overallProgress);
        }

        if (completed == total) {
            batchJob.setStatus(ConversionStatus.COMPLETED);
        } else if (completed > 0) {
            batchJob.setStatus(ConversionStatus.COMPLETED); // partially completed
        } else {
            batchJob.setStatus(ConversionStatus.FAILED);
        }
        batchJob.setCompletedAt(Instant.now());
        log.info("Finished batch conversion job {} with status {}", batchJob.getJobId(), batchJob.getStatus());
    }

    /**
     * Retrieves status and structure report for an active batch job.
     */
    public BatchJob getJob(String jobId) {
        BatchJob job = activeJobs.get(jobId);
        if (job == null) {
            throw new JobNotFoundException("Conversion job not found or expired: " + jobId);
        }
        return job;
    }

    /**
     * Streams an individual converted file for download.
     */
    public Resource getConvertedFile(String jobId, String fileId) {
        BatchJob job = getJob(jobId);
        FileJobItem item = job.getFiles().stream()
                .filter(f -> f.getFileId().equals(fileId))
                .findFirst()
                .orElseThrow(() -> new JobNotFoundException("File not found in job: " + fileId));

        if ((item.getStatus() != ConversionStatus.COMPLETED && item.getStatus() != ConversionStatus.DONE) || item.getOutputPath() == null) {
            throw new ConversionFailedException("File is not ready for download. Status: " + item.getStatus());
        }

        try {
            Resource resource = new UrlResource(item.getOutputPath().toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ConversionFailedException("Converted file is missing or unreadable on disk.");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ConversionFailedException("Could not read file URL: " + item.getOutputPath(), e);
        }
    }

    public FileJobItem getFileItem(String jobId, String fileId) {
        BatchJob job = getJob(jobId);
        return job.getFiles().stream()
                .filter(f -> f.getFileId().equals(fileId))
                .findFirst()
                .orElse(null);
    }

    public Object getFileStructureModel(String jobId, String fileId) {
        FileJobItem item = getFileItem(jobId, fileId);
        if (item == null) {
            throw new JobNotFoundException("File not found in job: " + fileId);
        }
        return item.getDocumentModel() != null ? item.getDocumentModel() : item.getStructureReport();
    }

    /**
     * Packages and streams a ZIP archive containing all converted files.
     */
    public Resource getJobZip(String jobId) {
        BatchJob job = getJob(jobId);
        Path zipPath = job.getDirectoryPath().resolve(jobId + "-converted.zip");

        if (job.getZipPath() == null || !Files.exists(zipPath)) {
            try {
                zipPacker.packageZip(zipPath, job.getFiles());
                job.setZipPath(zipPath);
            } catch (IOException e) {
                throw new ConversionFailedException("Failed to create ZIP package: " + e.getMessage(), e);
            }
        }

        try {
            Resource resource = new UrlResource(zipPath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ConversionFailedException("Generated ZIP file is unreadable.");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new ConversionFailedException("Could not read ZIP URL", e);
        }
    }

    /**
     * Immediately purges job files and metadata.
     */
    public void deleteJob(String jobId) {
        BatchJob job = activeJobs.remove(jobId);
        if (job != null && job.getDirectoryPath() != null) {
            deleteDirectoryQuietly(job.getDirectoryPath().toFile());
            log.info("Deleted batch conversion job {} on request", jobId);
        }
    }

    /**
     * Standalone document structure inspection.
     */
    public StructureReport analyzeSingleFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Cannot analyze empty file.");
        }
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String ext = name.contains(".") ? name.substring(name.lastIndexOf('.') + 1) : "";
        try {
            return structureAnalyzer.analyze(file.getBytes(), name, ext);
        } catch (IOException e) {
            throw new ConversionFailedException("Could not inspect document bytes: " + e.getMessage(), e);
        }
    }

    public List<ConversionEntry> getCapabilities() {
        return engineRegistry != null ? engineRegistry.getTestedEntries() : Collections.emptyList();
    }

    /**
     * Executes conversion task dispatched from RabbitMQ worker for a specific file in a job.
     */
    public void processFileTask(String jobId, String fileId, ConversionOptions options) throws Exception {
        BatchJob batchJob = getJob(jobId);
        FileJobItem item = batchJob.getFiles().stream()
                .filter(f -> f.getFileId().equals(fileId))
                .findFirst()
                .orElseThrow(() -> new JobNotFoundException("File not found in job: " + fileId));

        item.setStatus(ConversionStatus.PROCESSING);
        item.setProgress(30);
        broadcastJobUpdate(batchJob);

        ConversionEngine engine = engineRegistry != null
                ? engineRegistry.findEngineFor(item.getSourceFormat(), item.getTargetFormat())
                : null;

        if (engine != null) {
            engine.convert(
                    item.getSourcePath(),
                    item.getOutputPath(),
                    item.getSourceFormat(),
                    item.getTargetFormat(),
                    options != null ? options : batchJob.getOptions(),
                    percent -> {
                        item.setProgress(percent);
                        broadcastJobUpdate(batchJob);
                    }
            );
        } else {
            item.setProgress(50);
            converterEngine.convert(
                    item.getSourcePath(),
                    item.getOutputPath(),
                    item.getTargetFormat(),
                    options != null ? options : batchJob.getOptions()
            );
        }

        if (Files.exists(item.getOutputPath())) {
            item.setConvertedSizeBytes(Files.size(item.getOutputPath()));
        }
        item.setProgress(100);
        item.setStatus(ConversionStatus.DONE);

        // Update overall batch progress
        long completedCount = batchJob.getFiles().stream()
                .filter(f -> f.getStatus() == ConversionStatus.DONE || f.getStatus() == ConversionStatus.COMPLETED)
                .count();
        long failedCount = batchJob.getFiles().stream()
                .filter(f -> f.getStatus() == ConversionStatus.FAILED)
                .count();
        int total = batchJob.getFiles().size();

        int overall = (int) (((double) (completedCount + failedCount) / total) * 100);
        batchJob.setProgress(overall);

        if (completedCount + failedCount >= total) {
            batchJob.setStatus(completedCount > 0 ? ConversionStatus.COMPLETED : ConversionStatus.FAILED);
            batchJob.setCompletedAt(Instant.now());
        }

        broadcastJobUpdate(batchJob);
    }

    public void recordFileAttempt(String jobId, String fileId, int attempt, String errorCode) {
        BatchJob batchJob = activeJobs.get(jobId);
        if (batchJob != null) {
            batchJob.getFiles().stream()
                    .filter(f -> f.getFileId().equals(fileId))
                    .findFirst()
                    .ifPresent(item -> {
                        item.setAttempts(attempt);
                        item.setErrorCode(errorCode);
                        item.setErrorMessage(ConverterErrorMapper.toUserMessage(errorCode));
                        item.setStatus(ConversionStatus.PROCESSING);
                        broadcastJobUpdate(batchJob);
                    });
        }
    }

    public void markFileFailed(String jobId, String fileId, String errorCode, String userMessage) {
        BatchJob batchJob = activeJobs.get(jobId);
        if (batchJob != null) {
            batchJob.getFiles().stream()
                    .filter(f -> f.getFileId().equals(fileId))
                    .findFirst()
                    .ifPresent(item -> {
                        item.setStatus(ConversionStatus.FAILED);
                        item.setErrorCode(errorCode);
                        item.setErrorMessage(userMessage);
                    });

            long completed = batchJob.getFiles().stream()
                    .filter(f -> f.getStatus() == ConversionStatus.DONE || f.getStatus() == ConversionStatus.COMPLETED)
                    .count();
            long failed = batchJob.getFiles().stream()
                    .filter(f -> f.getStatus() == ConversionStatus.FAILED)
                    .count();
            int total = batchJob.getFiles().size();

            if (completed + failed >= total) {
                batchJob.setStatus(completed > 0 ? ConversionStatus.COMPLETED : ConversionStatus.FAILED);
                batchJob.setCompletedAt(Instant.now());
                batchJob.setProgress(100);
            }
            broadcastJobUpdate(batchJob);
        }
    }

    public String resolveQueueForPair(String inputFormat, String outputFormat) {
        if (engineRegistry != null) {
            var entry = engineRegistry.findEntry(inputFormat, outputFormat);
            if (entry.isPresent() && entry.get().getQueue() != null) {
                return entry.get().getQueue();
            }
        }
        String in = inputFormat.toLowerCase();
        String out = outputFormat.toLowerCase();
        if ("pdf".equals(in)) {
            if ("png".equals(out) || "jpg".equals(out) || "jpeg".equals(out)) {
                return ConverterQueueConstants.QUEUE_PDF;
            }
            if ("txt".equals(out)) {
                return ConverterQueueConstants.QUEUE_PDF;
            }
        }
        if (List.of("png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff").contains(in)) {
            return ConverterQueueConstants.QUEUE_IMAGE;
        }
        if ("txt".equals(out) || "csv".equals(out)) {
            return ConverterQueueConstants.QUEUE_TEXT;
        }
        return ConverterQueueConstants.QUEUE_OFFICE;
    }

    /**
     * Subscribes a client to Server-Sent Events (SSE) for real-time progress updates.
     */
    public SseEmitter subscribeEvents(String jobId) {
        SseEmitter emitter = new SseEmitter(180_000L);
        sseEmitters.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError(e -> removeEmitter(jobId, emitter));

        BatchJob job = activeJobs.get(jobId);
        if (job != null) {
            try {
                emitter.send(SseEmitter.event().name("status").data(job));
            } catch (IOException ignored) {}
        }
        return emitter;
    }

    private void removeEmitter(String jobId, SseEmitter emitter) {
        List<SseEmitter> list = sseEmitters.get(jobId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                sseEmitters.remove(jobId);
            }
        }
    }

    private void broadcastJobUpdate(BatchJob job) {
        List<SseEmitter> emitters = sseEmitters.get(job.getJobId());
        if (emitters != null) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("progress").data(job));
                } catch (Exception e) {
                    removeEmitter(job.getJobId(), emitter);
                }
            }
        }
    }

    /**
     * Scheduled cleanup job purging expired directories older than the configured TTL (1 hour).
     */
    @Scheduled(cron = "${app.converter.cleanup-cron:0 */15 * * * *}")
    public void cleanupOldJobs() {
        Instant threshold = Instant.now().minus(Duration.ofMinutes(properties.getJobTtlMinutes()));
        log.debug("Running scheduled batch cleanup. Purging jobs created before {}", threshold);

        activeJobs.entrySet().removeIf(entry -> {
            BatchJob job = entry.getValue();
            if (job.getCreatedAt().isBefore(threshold)) {
                if (job.getDirectoryPath() != null) {
                    deleteDirectoryQuietly(job.getDirectoryPath().toFile());
                }
                log.info("Purged expired conversion job {}", entry.getKey());
                return true;
            }
            return false;
        });

        // Also clean orphaned batch directories on filesystem
        Path baseTemp = properties.resolveTempDirectory();
        if (Files.exists(baseTemp)) {
            File[] dirs = baseTemp.toFile().listFiles(File::isDirectory);
            if (dirs != null) {
                long cutoffEpoch = threshold.toEpochMilli();
                for (File dir : dirs) {
                    if (dir.getName().startsWith("batch-") && dir.lastModified() < cutoffEpoch) {
                        deleteDirectoryQuietly(dir);
                    }
                }
            }
        }
    }

    private void deleteDirectoryQuietly(File dir) {
        if (dir == null || !dir.exists()) return;
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    deleteDirectoryQuietly(f);
                } else {
                    f.delete();
                }
            }
        }
        dir.delete();
    }
}

