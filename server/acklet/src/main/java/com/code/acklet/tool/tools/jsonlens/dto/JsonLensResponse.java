package com.code.acklet.tool.tools.jsonlens.dto;

public class JsonLensResponse {
    private boolean success;
    private String formattedJson;
    private int lineCount;
    private long byteSize;
    private String error;
    private Integer errorLine;
    private Integer errorColumn;

    public JsonLensResponse() {}

    public static JsonLensResponse success(String formattedJson, int lineCount, long byteSize) {
        JsonLensResponse resp = new JsonLensResponse();
        resp.setSuccess(true);
        resp.setFormattedJson(formattedJson);
        resp.setLineCount(lineCount);
        resp.setByteSize(byteSize);
        return resp;
    }

    public static JsonLensResponse error(String error, Integer line, Integer col) {
        JsonLensResponse resp = new JsonLensResponse();
        resp.setSuccess(false);
        resp.setError(error);
        resp.setErrorLine(line);
        resp.setErrorColumn(col);
        return resp;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getFormattedJson() {
        return formattedJson;
    }

    public void setFormattedJson(String formattedJson) {
        this.formattedJson = formattedJson;
    }

    public int getLineCount() {
        return lineCount;
    }

    public void setLineCount(int lineCount) {
        this.lineCount = lineCount;
    }

    public long getByteSize() {
        return byteSize;
    }

    public void setByteSize(long byteSize) {
        this.byteSize = byteSize;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public Integer getErrorLine() {
        return errorLine;
    }

    public void setErrorLine(Integer errorLine) {
        this.errorLine = errorLine;
    }

    public Integer getErrorColumn() {
        return errorColumn;
    }

    public void setErrorColumn(Integer errorColumn) {
        this.errorColumn = errorColumn;
    }
}
