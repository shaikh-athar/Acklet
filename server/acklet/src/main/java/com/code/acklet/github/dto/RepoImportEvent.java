package com.code.acklet.github.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RepoImportEvent implements Serializable {
    private static final long serialVersionUID = 1L;

    private UUID jobId;
    private UUID accountId;
    private String repoFullName;

    private String branch;
    private String buildCommand;
    private String startCommand;
    private String installCommand;
    private java.util.Map<String, String> envVars;
}
