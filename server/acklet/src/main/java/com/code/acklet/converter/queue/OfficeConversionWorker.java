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

import static com.code.acklet.converter.queue.ConverterQueueConstants.QUEUE_OFFICE;

@Slf4j
@Component
@RequiredArgsConstructor
public class OfficeConversionWorker {

    private final BaseConversionWorker baseWorker;

    @RabbitListener(queues = QUEUE_OFFICE, concurrency = "${app.converter.office-concurrency:2}", ackMode = "MANUAL")
    public void onOfficeTask(@Payload ConversionTaskMessage message,
                             Channel channel,
                             @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        log.debug("Office worker picked up task for file {}", message.getFileId());
        baseWorker.processTask(message, channel, deliveryTag);
    }
}

