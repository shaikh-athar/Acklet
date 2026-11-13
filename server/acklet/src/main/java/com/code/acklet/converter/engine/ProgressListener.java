package com.code.acklet.converter.engine;

@FunctionalInterface
public interface ProgressListener {
    void onProgress(int percent);
}

