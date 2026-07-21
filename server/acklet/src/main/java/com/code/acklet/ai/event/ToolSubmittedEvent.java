package com.code.acklet.ai.event;

import com.code.acklet.tool.entity.Tool;
import org.springframework.context.ApplicationEvent;

/**
 * Published when a tool transitions from DRAFT to PENDING (submitted for review).
 * The AI orchestrator listens to this event and starts the enrichment pipeline.
 */
public class ToolSubmittedEvent extends ApplicationEvent {

    private final Tool tool;

    public ToolSubmittedEvent(Object source, Tool tool) {
        super(source);
        this.tool = tool;
    }

    public Tool getTool() { return tool; }
}
