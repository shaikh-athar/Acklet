package com.code.acklet.github.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ProjectConfigurationValidator {

    public static class ValidationResult {
        public final boolean valid;
        public final List<String> warnings;
        public final List<String> errors;

        public ValidationResult(boolean valid, List<String> warnings, List<String> errors) {
            this.valid = valid;
            this.warnings = warnings;
            this.errors = errors;
        }
    }

    public ValidationResult validate(String buildCommand, String startCommand, Integer port, Map<String, String> envVars) {
        List<String> warnings = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        // Port validation
        if (port != null) {
            if (port < 1 || port > 65535) {
                errors.add("Port must be between 1 and 65535. Received: " + port);
            } else if (port < 1024 && port != 80 && port != 443) {
                warnings.add("Port " + port + " is in the privileged range (1-1023). Ensure sandbox environment supports root bindings.");
            }
        }

        // Command validation
        if (buildCommand != null && buildCommand.contains("rm -rf /")) {
            errors.add("Build command contains destructive shell pattern: 'rm -rf /'");
        }
        if (startCommand != null && startCommand.contains("rm -rf /")) {
            errors.add("Start command contains destructive shell pattern: 'rm -rf /'");
        }

        // Environment variables check
        if (envVars != null) {
            for (Map.Entry<String, String> entry : envVars.entrySet()) {
                if (entry.getKey() == null || entry.getKey().isBlank()) {
                    warnings.add("Environment variable contains empty or blank key name.");
                }
            }
        }

        boolean isValid = errors.isEmpty();
        return new ValidationResult(isValid, warnings, errors);
    }
}
