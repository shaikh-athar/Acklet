package com.code.acklet.converter.queue;

import com.code.acklet.converter.*;
import com.code.acklet.converter.engine.EngineRegistry;
import com.code.acklet.converter.exception.QueueUnavailableException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("RabbitMQ Reliability Pipeline Tests")
class RabbitMqReliabilityIntegrationTest {

    private FileConverterJobService jobService;
    private ConversionMessageProducer messageProducer;
    private BaseConversionWorker baseWorker;
    private Channel mockChannel;
    private ConverterProperties properties;
    private EngineRegistry engineRegistry;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        properties = new ConverterProperties();
        Path tempDir = Files.createTempDirectory("rabbit-test-temp");
        properties.setTempDir(tempDir.toString());
        properties.setDevFallback(true);

        ConverterValidator validator = new ConverterValidator(properties);
        StructureAnalyzer structureAnalyzer = new StructureAnalyzer();
        ZipPacker zipPacker = new ZipPacker();
        JodConverterService jodService = new JodConverterService(properties, validator);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        engineRegistry = new EngineRegistry(objectMapper, List.of(
                new com.code.acklet.converter.engine.JodConverterEngine(jodService),
                new com.code.acklet.converter.engine.PdfBoxEngine(jodService)
        ));
        engineRegistry.init();

        messageProducer = mock(ConversionMessageProducer.class);
        when(messageProducer.publishTask(any())).thenReturn(true);

        jobService = new FileConverterJobService(properties, validator, structureAnalyzer, zipPacker, jodService, engineRegistry);
        jobService.init();

        // Inject messageProducer into jobService via reflection or field
        var producerField = FileConverterJobService.class.getDeclaredField("messageProducer");
        producerField.setAccessible(true);
        producerField.set(jobService, messageProducer);

        baseWorker = new BaseConversionWorker(jobService, messageProducer);
        mockChannel = mock(Channel.class);
    }

    @Test
    @DisplayName("1. Happy Path: Task executes, status is DONE, manual basicAck is called")
    void testHappyPathTaskCompletesAndAcks() throws Exception {
        byte[] docxBytes = "test content".getBytes();
        MockMultipartFile file = new MockMultipartFile("files", "report.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        BatchJob job = jobService.createJob(new MockMultipartFile[]{file}, new ConversionOptions());
        String fileId = job.getFiles().get(0).getFileId();

        ConversionTaskMessage taskMessage = ConversionTaskMessage.builder()
                .jobId(job.getJobId())
                .fileId(fileId)
                .inputType("docx")
                .outputType("pdf")
                .queue(ConverterQueueConstants.QUEUE_OFFICE)
                .attempt(1)
                .build();

        long deliveryTag = 101L;
        baseWorker.processTask(taskMessage, mockChannel, deliveryTag);

        // Verify channel acked
        verify(mockChannel, times(1)).basicAck(deliveryTag, false);

        // Verify file is completed
        FileJobItem item = jobService.getFileItem(job.getJobId(), fileId);
        assertNotNull(item);
        assertEquals(ConversionStatus.DONE, item.getStatus());
        assertEquals(100, item.getProgress());
    }

    @Test
    @DisplayName("2. Retryable Error: Worker throws TIMEOUT -> routed to fc.retry.5s with attempt incremented")
    void testRetryableErrorRoutesToRetryQueue() throws Exception {
        byte[] docxBytes = "test content".getBytes();
        MockMultipartFile file = new MockMultipartFile("files", "timeout_doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        BatchJob job = jobService.createJob(new MockMultipartFile[]{file}, new ConversionOptions());
        String fileId = job.getFiles().get(0).getFileId();

        // Spy or inject a failing service to throw TIMEOUT
        FileConverterJobService spiedService = spy(jobService);
        doThrow(new RuntimeException("TIMEOUT: Conversion took longer than 120 seconds"))
                .when(spiedService).processFileTask(eq(job.getJobId()), eq(fileId), any());

        BaseConversionWorker worker = new BaseConversionWorker(spiedService, messageProducer);

        ConversionTaskMessage taskMessage = ConversionTaskMessage.builder()
                .jobId(job.getJobId())
                .fileId(fileId)
                .inputType("docx")
                .outputType("pdf")
                .queue(ConverterQueueConstants.QUEUE_OFFICE)
                .attempt(1)
                .build();

        long deliveryTag = 102L;
        worker.processTask(taskMessage, mockChannel, deliveryTag);

        // Verify routed to retry 5s queue and original message was acked
        verify(messageProducer, times(1)).routeToRetry(eq(taskMessage), eq(ConverterQueueConstants.QUEUE_RETRY_5S));
        assertEquals(2, taskMessage.getAttempt());
        verify(mockChannel, times(1)).basicAck(deliveryTag, false);
    }

    @Test
    @DisplayName("3. Permanent Error: CORRUPTED_FILE -> routed straight to fc.dlq with clean user message")
    void testPermanentErrorRoutesStraightToDlq() throws Exception {
        byte[] docxBytes = "test content".getBytes();
        MockMultipartFile file = new MockMultipartFile("files", "corrupted.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        BatchJob job = jobService.createJob(new MockMultipartFile[]{file}, new ConversionOptions());
        String fileId = job.getFiles().get(0).getFileId();

        FileConverterJobService spiedService = spy(jobService);
        doThrow(new RuntimeException("CORRUPTED_FILE: File structure damaged"))
                .when(spiedService).processFileTask(eq(job.getJobId()), eq(fileId), any());

        BaseConversionWorker worker = new BaseConversionWorker(spiedService, messageProducer);

        ConversionTaskMessage taskMessage = ConversionTaskMessage.builder()
                .jobId(job.getJobId())
                .fileId(fileId)
                .inputType("docx")
                .outputType("pdf")
                .queue(ConverterQueueConstants.QUEUE_OFFICE)
                .attempt(1)
                .build();

        long deliveryTag = 103L;
        worker.processTask(taskMessage, mockChannel, deliveryTag);

        // Routed to DLQ without retry
        verify(messageProducer, times(1)).routeToDlq(eq(taskMessage));
        verify(messageProducer, never()).routeToRetry(any(), any());
        verify(mockChannel, times(1)).basicAck(deliveryTag, false);

        FileJobItem item = jobService.getFileItem(job.getJobId(), fileId);
        assertNotNull(item);
        assertEquals(ConversionStatus.FAILED, item.getStatus());
        assertEquals("CORRUPTED_FILE", item.getErrorCode());
        assertEquals("This file appears to be damaged or incomplete. Please check the file and try again.", item.getErrorMessage());
    }

    @Test
    @DisplayName("4. Idempotency: Duplicate message for completed file is immediately acked without reprocessing")
    void testIdempotencyDuplicateMessageAckedImmediately() throws Exception {
        byte[] docxBytes = "test content".getBytes();
        MockMultipartFile file = new MockMultipartFile("files", "already_done.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        BatchJob job = jobService.createJob(new MockMultipartFile[]{file}, new ConversionOptions());
        String fileId = job.getFiles().get(0).getFileId();

        // Mark as already COMPLETED
        FileJobItem existing = jobService.getFileItem(job.getJobId(), fileId);
        existing.setStatus(ConversionStatus.COMPLETED);

        FileConverterJobService spiedService = spy(jobService);
        BaseConversionWorker worker = new BaseConversionWorker(spiedService, messageProducer);

        ConversionTaskMessage taskMessage = ConversionTaskMessage.builder()
                .jobId(job.getJobId())
                .fileId(fileId)
                .inputType("docx")
                .outputType("pdf")
                .queue(ConverterQueueConstants.QUEUE_OFFICE)
                .attempt(1)
                .build();

        long deliveryTag = 104L;
        worker.processTask(taskMessage, mockChannel, deliveryTag);

        // Ensure processFileTask was never called
        verify(spiedService, never()).processFileTask(any(), any(), any());
        verify(mockChannel, times(1)).basicAck(deliveryTag, false);
    }

    @Test
    @DisplayName("5. Backpressure: Queue depth > 20 triggers HTTP 503 QUEUE_UNAVAILABLE")
    void testBackpressureOfficeQueueDepthTriggers503() {
        when(messageProducer.getQueueDepth(ConverterQueueConstants.QUEUE_OFFICE)).thenReturn(25);

        byte[] docxBytes = "test content".getBytes();
        MockMultipartFile file = new MockMultipartFile("files", "heavy_load.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxBytes);

        QueueUnavailableException ex = assertThrows(QueueUnavailableException.class, () -> {
            jobService.createJob(new MockMultipartFile[]{file}, new ConversionOptions());
        });

        assertEquals("QUEUE_UNAVAILABLE", ex.getCode());
        assertTrue(ex.getMessage().contains("Conversion queue is full"));
    }

    @Test
    @DisplayName("6. Single Registry: All 'tested' pairs in conversions.json have valid metadata and test coverage")
    void testAllTestedEntriesInRegistryAreValid() throws Exception {
        InputStream is = getClass().getResourceAsStream("/conversions.json");
        assertNotNull(is, "conversions.json must exist in classpath");

        List<Map<String, Object>> entries = objectMapper.readValue(is, new TypeReference<>() {});
        assertFalse(entries.isEmpty());

        long testedCount = 0;
        for (Map<String, Object> entry : entries) {
            String inputType = (String) entry.get("inputType");
            String outputType = (String) entry.get("outputType");
            String status = (String) entry.get("status");
            String runtime = (String) entry.get("runtime");
            String tier = (String) entry.get("tier");

            assertNotNull(inputType, "inputType cannot be null");
            assertNotNull(outputType, "outputType cannot be null");
            assertNotNull(runtime, "runtime cannot be null");
            assertNotNull(tier, "tier cannot be null");

            assertTrue(List.of("server", "browser").contains(runtime), "Runtime must be server or browser: " + runtime);
            assertTrue(List.of("stable", "beta").contains(tier), "Tier must be stable or beta: " + tier);

            if ("tested".equals(status)) {
                testedCount++;
                int score = (Integer) entry.get("recommendationScore");
                assertTrue(score > 0, "Tested entry must have recommendationScore > 0");

                if ("server".equals(runtime)) {
                    String queue = (String) entry.get("queue");
                    assertNotNull(queue, "Server tested entry must have a queue: " + inputType + " -> " + outputType);
                    assertTrue(queue.startsWith("fc.convert."), "Queue must start with fc.convert.: " + queue);
                }
            }
        }

        assertTrue(testedCount >= 30, "Expected at least 30 tested conversion pairs in registry, found: " + testedCount);
    }
}
