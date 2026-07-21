package com.code.acklet.ai.prompt;

/**
 * All prompt templates used across the AI pipeline.
 *
 * Rules:
 *  - Use {{variable}} placeholders that callers replace with String.formatted()
 *  - Keep prompts instructional and structured (JSON output where needed)
 *  - All prompts request concise, developer-focused output
 */
public final class PromptTemplates {

    private PromptTemplates() {}

    // ── Summary ───────────────────────────────────────────────────────────────

    public static final String SUMMARY = """
            You are a technical writer for a developer tool platform called Acklet.
            
            Generate a concise, developer-focused summary for the following tool:
            
            Name: %s
            Description: %s
            Category: %s
            Website: %s
            
            Requirements:
            - Maximum 3 sentences
            - Focus on what problem it solves and who benefits
            - Use plain, direct language — no marketing fluff
            - Do NOT start with "This tool" or "Acklet provides"
            
            Return ONLY the summary text. No headings, no bullet points.
            """;

    // ── Capabilities ─────────────────────────────────────────────────────────

    public static final String CAPABILITIES = """
            You are a developer tool analyst for a platform called Acklet.
            
            Extract the concrete capabilities of this tool:
            
            Name: %s
            Description: %s
            Overview: %s
            
            Return a JSON array of capability objects. Each object must have:
            - "name": short capability name (e.g. "JSON Validation", "Schema Generation")
            - "description": one-sentence description of what the capability does
            - "confidence": float between 0.0 and 1.0 (how confident you are this is accurate)
            
            Return ONLY valid JSON. No explanation, no markdown fences.
            Example: [{"name":"JSON Validation","description":"Validates JSON against RFC 7159.","confidence":0.95}]
            
            Extract between 3 and 10 capabilities.
            """;

    // ── SEO Metadata ─────────────────────────────────────────────────────────

    public static final String SEO = """
            You are an SEO specialist for a developer tool platform called Acklet.
            
            Generate SEO metadata for this developer tool:
            
            Name: %s
            Description: %s
            Category: %s
            
            Return a JSON object with these exact fields:
            - "metaTitle": page title (50-60 chars)
            - "metaDescription": meta description (150-160 chars)
            - "keywords": array of 5-10 relevant search keywords
            - "ogTitle": open graph title (same or slightly different from metaTitle)
            - "ogDescription": open graph description (1-2 sentences)
            
            Return ONLY valid JSON. No explanation, no markdown fences.
            """;

    // ── Documentation Overview ────────────────────────────────────────────────

    public static final String DOCUMENTATION = """
            You are a technical documentation writer for a developer tool platform called Acklet.
            
            Generate structured documentation for this tool:
            
            Name: %s
            Description: %s
            Website: %s
            
            Return a JSON object with these fields:
            - "purpose": what problem does this tool solve (2-3 sentences)
            - "whoShouldUse": target audience description (1-2 sentences)
            - "whoShouldAvoid": who should NOT use this tool (1 sentence)
            - "bestPractices": array of 3-5 best practice strings
            - "advantages": array of 3-5 advantage strings
            - "limitations": array of 2-4 limitation strings
            
            Return ONLY valid JSON. No explanation, no markdown fences.
            """;
}
