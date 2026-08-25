package com.code.acklet.tool.easyconvert;

/**
 * Explicit Job Lifecycle States as specified in EasyConvert description Section 40.
 */
public enum EasyConvertJobStatus {
    CREATED,
    VALIDATING_INPUT,
    UPLOADING,
    QUEUED,
    PROCESSING,
    VALIDATING_OUTPUT,
    COMPLETED,
    FAILED,
    CANCEL_REQUESTED,
    CANCELLED,
    EXPIRED
}
