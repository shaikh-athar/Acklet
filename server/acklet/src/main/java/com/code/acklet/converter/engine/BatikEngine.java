package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.exception.ConversionException;
import lombok.extern.slf4j.Slf4j;
import org.apache.batik.transcoder.TranscoderInput;
import org.apache.batik.transcoder.TranscoderOutput;
import org.apache.batik.transcoder.image.PNGTranscoder;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
public class BatikEngine implements ConversionEngine {

    @Override
    public String getName() {
        return "batik";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        return "svg".equalsIgnoreCase(inputType.trim()) && "png".equalsIgnoreCase(outputType.trim());
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        if (listener != null) listener.onProgress(20);

        try (InputStream in = Files.newInputStream(source);
             OutputStream out = Files.newOutputStream(target)) {

            PNGTranscoder transcoder = new PNGTranscoder();
            TranscoderInput input = new TranscoderInput(in);
            TranscoderOutput output = new TranscoderOutput(out);

            transcoder.transcode(input, output);
        } catch (Exception e) {
            throw new ConversionException("CONVERSION_FAILED: Failed to rasterize vector graphics: " + e.getMessage());
        }

        if (listener != null) listener.onProgress(100);
    }
}

