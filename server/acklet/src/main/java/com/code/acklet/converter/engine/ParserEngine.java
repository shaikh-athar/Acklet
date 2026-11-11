package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.exception.ConversionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
public class ParserEngine implements ConversionEngine {

    @Override
    public String getName() {
        return "parser";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();

        return ("srt".equals(in) && ("vtt".equals(out) || "txt".equals(out)))
                || ("vtt".equals(in) && "srt".equals(out))
                || ("vcf".equals(in) && "csv".equals(out));
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        String in = inExt.toLowerCase().trim();
        String out = outExt.toLowerCase().trim();

        if (listener != null) listener.onProgress(20);

        if ("srt".equals(in) && "vtt".equals(out)) {
            convertSrtToVtt(source, target);
        } else if ("vtt".equals(in) && "srt".equals(out)) {
            convertVttToSrt(source, target);
        } else if ("srt".equals(in) && "txt".equals(out)) {
            convertSrtToTxt(source, target);
        } else if ("vcf".equals(in) && "csv".equals(out)) {
            convertVcfToCsv(source, target);
        } else {
            throw new ConversionException("UNSUPPORTED_PAIR: Unsupported parser pair: " + in + " -> " + out);
        }

        if (listener != null) listener.onProgress(100);
    }

    private void convertSrtToVtt(Path source, Path target) throws IOException {
        List<String> lines = Files.readAllLines(source, StandardCharsets.UTF_8);
        try (BufferedWriter writer = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {
            writer.write("WEBVTT");
            writer.newLine();
            writer.newLine();

            for (String line : lines) {
                // SRT timestamp line: 00:01:20,000 --> 00:01:23,000 -> 00:01:20.000 --> 00:01:23.000
                if (line.contains("-->")) {
                    writer.write(line.replace(',', '.'));
                } else {
                    writer.write(line);
                }
                writer.newLine();
            }
        }
    }

    private void convertVttToSrt(Path source, Path target) throws IOException {
        List<String> lines = Files.readAllLines(source, StandardCharsets.UTF_8);
        try (BufferedWriter writer = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {
            int cueIndex = 1;
            boolean hasHeader = true;

            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i).trim();
                if (hasHeader) {
                    if (line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
                        continue;
                    }
                    if (line.isEmpty()) {
                        hasHeader = false;
                        continue;
                    }
                }

                if (line.contains("-->")) {
                    writer.write(String.valueOf(cueIndex++));
                    writer.newLine();
                    writer.write(line.replace('.', ','));
                    writer.newLine();
                } else if (!line.isEmpty()) {
                    writer.write(line);
                    writer.newLine();
                } else {
                    writer.newLine();
                }
            }
        }
    }

    private void convertSrtToTxt(Path source, Path target) throws IOException {
        List<String> lines = Files.readAllLines(source, StandardCharsets.UTF_8);
        try (BufferedWriter writer = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.matches("^\\d+$") || trimmed.contains("-->")) {
                    continue;
                }
                writer.write(trimmed);
                writer.newLine();
            }
        }
    }

    private void convertVcfToCsv(Path source, Path target) throws IOException {
        List<String> lines = Files.readAllLines(source, StandardCharsets.UTF_8);
        try (BufferedWriter writer = Files.newBufferedWriter(target, StandardCharsets.UTF_8)) {
            writer.write("FullName,Name,Email,Phone,Organization");
            writer.newLine();

            String fn = "", n = "", email = "", phone = "", org = "";
            for (String line : lines) {
                String trimmed = line.trim();
                if (trimmed.startsWith("BEGIN:VCARD")) {
                    fn = ""; n = ""; email = ""; phone = ""; org = "";
                } else if (trimmed.startsWith("FN:")) {
                    fn = trimmed.substring(3).trim();
                } else if (trimmed.startsWith("N:")) {
                    n = trimmed.substring(2).trim();
                } else if (trimmed.startsWith("EMAIL") && trimmed.contains(":")) {
                    email = trimmed.substring(trimmed.indexOf(':') + 1).trim();
                } else if (trimmed.startsWith("TEL") && trimmed.contains(":")) {
                    phone = trimmed.substring(trimmed.indexOf(':') + 1).trim();
                } else if (trimmed.startsWith("ORG:")) {
                    org = trimmed.substring(4).trim();
                } else if (trimmed.startsWith("END:VCARD")) {
                    writer.write(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"",
                            escapeCsv(fn), escapeCsv(n), escapeCsv(email), escapeCsv(phone), escapeCsv(org)));
                    writer.newLine();
                }
            }
        }
    }

    private String escapeCsv(String s) {
        if (s == null) return "";
        return s.replace("\"", "\"\"");
    }
}

