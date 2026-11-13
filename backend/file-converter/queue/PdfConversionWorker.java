package com.code.acklet.converter.queue;

import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.io.IOException;

import static com.code.acklet.converter.queue.ConverterQueueConstants.QUEUE_PDF;

@Slf4j
@Component
@RequiredArgsConstructor
public class PdfConversionWorker {

    private final BaseConversionWorker baseWorker;

    @RabbitListener(queues = QUEUE_PDF, ackMode = "MANUAL")
    public void onPdfTask(@Payload ConversionTaskMessage message,
                          Channel channel,
                          @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        log.debug("PDF worker picked up task for file {}", message.getFileId());
        baseWorker.processTask(message, channel, deliveryTag);
    }
}
