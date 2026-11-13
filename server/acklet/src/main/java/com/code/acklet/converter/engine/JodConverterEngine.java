package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.JodConverterService;
import com.code.acklet.converter.exception.ConversionException;
import com.code.acklet.converter.exception.ConversionFailedException;
import com.code.acklet.converter.exception.ConversionTimeoutException;
import com.code.acklet.converter.exception.EngineUnavailableException;
import com.code.acklet.converter.exception.UnsupportedFormatException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class JodConverterEngine implements ConversionEngine {

    private final JodConverterService jodConverterService;

    @Override
    public String getName() {
        return "jodconverter";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();
        return ("pdf".equals(out) && ("docx".equals(in) || "odt".equals(in) || "rtf".equals(in)
                || "txt".equals(in) || "html".equals(in) || "xlsx".equals(in) || "xls".equals(in)
                || "ods".equals(in) || "csv".equals(in) || "tsv".equals(in) || "pptx".equals(in) || "odp".equals(in)))
                || ("docx".equals(in) && ("odt".equals(out) || "rtf".equals(out) || "txt".equals(out)))
                || ("odt".equals(in) && "docx".equals(out))
                || ("xls".equals(in) && "xlsx".equals(out))
                || ("xlsx".equals(in) && "ods".equals(out))
                || ("ods".equals(in) && "xlsx".equals(out))
                || ("pptx".equals(in) && "odp".equals(out))
                || ("odp".equals(in) && "pptx".equals(out))
                || ("pdf".equals(in) && "docx".equals(out));
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        try {
            if (listener != null) listener.onProgress(20);
            jodConverterService.convert(source, target, outExt, options);
            if (listener != null) listener.onProgress(100);
        } catch (UnsupportedFormatException e) {
            throw new ConversionException("UNSUPPORTED_PAIR: " + e.getMessage());
        } catch (ConversionTimeoutException e) {
            throw new ConversionException("TIMEOUT: The conversion operation timed out.");
        } catch (EngineUnavailableException e) {
            throw new ConversionException("ENGINE_UNAVAILABLE: Conversion runtime is temporarily unavailable.");
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.toLowerCase().contains("corrupt") || msg.toLowerCase().contains("damaged")) {
                throw new ConversionException("CORRUPTED_FILE: The input document appears to be corrupted or invalid.");
            }
            throw new ConversionException("CONVERSION_FAILED: " + msg);
        }
    }

    @Override
    public boolean isAvailable() {
        return jodConverterService.isAvailable();
    }
}

