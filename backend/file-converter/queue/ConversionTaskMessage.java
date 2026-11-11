package com.code.acklet.converter.queue;

import com.code.acklet.converter.ConversionOptions;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Lightweight RabbitMQ payload carrying only job and task references.
 * Explicitly excludes document binary bytes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionTaskMessage implements Serializable {

    private String jobId;
    private String fileId;
    private String inputType;
    private String outputType;
    private ConversionOptions options;

    @Builder.Default
    private int attempt = 1;

    private String queue;

    @Builder.Default
    private long timestamp = System.currentTimeMillis();
}
