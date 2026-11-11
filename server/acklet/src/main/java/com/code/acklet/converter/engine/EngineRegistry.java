package com.code.acklet.converter.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class EngineRegistry {

    private final ObjectMapper objectMapper;
    private final List<ConversionEngine> engines;

    @Getter
    private List<ConversionEntry> allEntries = Collections.emptyList();

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("conversions.json");
            try (InputStream is = resource.getInputStream()) {
                allEntries = objectMapper.readValue(is, new TypeReference<List<ConversionEntry>>() {});
            }
            log.info("Initialized EngineRegistry with {} conversion entries", allEntries.size());
        } catch (Exception e) {
            log.error("Failed to load conversions registry: {}", e.getMessage(), e);
        }
    }

    public List<ConversionEntry> getTestedEntries() {
        return allEntries.stream()
                .filter(e -> "tested".equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());
    }

    public List<ConversionEntry> getTestedEntriesForInput(String inputType) {
        if (inputType == null) return Collections.emptyList();
        String norm = inputType.toLowerCase().trim();
        return allEntries.stream()
                .filter(e -> "tested".equalsIgnoreCase(e.getStatus()))
                .filter(e -> norm.equalsIgnoreCase(e.getInputType()))
                .collect(Collectors.toList());
    }

    public Optional<ConversionEntry> findEntry(String inputType, String outputType) {
        if (inputType == null || outputType == null) return Optional.empty();
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();
        return allEntries.stream()
                .filter(e -> in.equalsIgnoreCase(e.getInputType()) && out.equalsIgnoreCase(e.getOutputType()))
                .findFirst();
    }

    public ConversionEngine getEngine(String engineName) {
        return engines.stream()
                .filter(eng -> eng.getName().equalsIgnoreCase(engineName))
                .findFirst()
                .orElse(null);
    }

    public ConversionEngine findEngineFor(String inputType, String outputType) {
        if (inputType == null || outputType == null) return null;
        Optional<ConversionEntry> entry = findEntry(inputType, outputType);
        if (entry.isPresent()) {
            ConversionEngine byName = getEngine(entry.get().getEngine());
            if (byName != null) return byName;
        }
        return engines.stream()
                .filter(eng -> eng.supports(inputType, outputType))
                .findFirst()
                .orElse(null);
    }
}

