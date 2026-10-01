package com.code.acklet.tool.tools.jsonlens.dto;

public class JsonLensRequest {
    private String json;
    private int indent = 2;
    private boolean sortKeys = false;
    private boolean minify = false;

    public JsonLensRequest() {}

    public JsonLensRequest(String json, int indent, boolean sortKeys, boolean minify) {
        this.json = json;
        this.indent = indent;
        this.sortKeys = sortKeys;
        this.minify = minify;
    }

    public String getJson() {
        return json;
    }

    public void setJson(String json) {
        this.json = json;
    }

    public int getIndent() {
        return indent;
    }

    public void setIndent(int indent) {
        this.indent = indent;
    }

    public boolean isSortKeys() {
        return sortKeys;
    }

    public void setSortKeys(boolean sortKeys) {
        this.sortKeys = sortKeys;
    }

    public boolean isMinify() {
        return minify;
    }

    public void setMinify(boolean minify) {
        this.minify = minify;
    }
}
