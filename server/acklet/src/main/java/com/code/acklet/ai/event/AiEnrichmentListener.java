package com.code.acklet.ai.event;

import com.code.acklet.ai.service.AiOrchestrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for ToolSubmittedEvent and triggers the AI enrichment pipeline.
 *
 * Uses @TransactionalEventListener with AFTER_COMMIT phase so the tool's PENDING
 * status is visible to the background thread before enrichment begins.
 *
 * Only active when at least one AiProvider bean is present (i.e. an API key is configured).
 * If no AI keys are configured, this listener is a no-op.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiEnrichmentListener {

    private final AiOrchestrationService orchestrationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onToolSubmitted(ToolSubmittedEvent event) {
        log.info("ToolSubmittedEvent received for tool: {}. Triggering AI enrichment.",
                event.getTool().getSlug());
        orchestrationService.enrich(event.getTool().getId());
    }
}
