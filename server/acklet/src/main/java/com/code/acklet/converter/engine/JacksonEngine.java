package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.exception.ConversionException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.csv.CsvMapper;
import com.fasterxml.jackson.dataformat.csv.CsvSchema;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Map;

@Slf4j
@Component
public class JacksonEngine implements ConversionEngine {

    private final ObjectMapper jsonMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    private final YAMLMapper yamlMapper = new YAMLMapper();
    private final XmlMapper xmlMapper = new XmlMapper();
    private final CsvMapper csvMapper = new CsvMapper();

    @Override
    public String getName() {
        return "jackson";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();

        return ("json".equals(in) && ("csv".equals(out) || "yaml".equals(out) || "yml".equals(out) || "xml".equals(out)))
                || ("csv".equals(in) && "json".equals(out))
                || (("yaml".equals(in) || "yml".equals(in)) && "json".equals(out))
                || ("xml".equals(in) && "json".equals(out));
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        String in = inExt.toLowerCase().trim();
        String out = outExt.toLowerCase().trim();

        if (listener != null) listener.onProgress(20);

        try {
            if ("json".equals(in) && ("yaml".equals(out) || "yml".equals(out))) {
                JsonNode tree = jsonMapper.readTree(source.toFile());
                yamlMapper.writeValue(target.toFile(), tree);
            } else if (("yaml".equals(in) || "yml".equals(in)) && "json".equals(out)) {
                JsonNode tree = yamlMapper.readTree(source.toFile());
                jsonMapper.writeValue(target.toFile(), tree);
            } else if ("json".equals(in) && "xml".equals(out)) {
                JsonNode tree = jsonMapper.readTree(source.toFile());
                xmlMapper.writeValue(target.toFile(), tree);
            } else if ("xml".equals(in) && "json".equals(out)) {
                JsonNode tree = xmlMapper.readTree(source.toFile());
                jsonMapper.writeValue(target.toFile(), tree);
            } else if ("json".equals(in) && "csv".equals(out)) {
                convertJsonToCsv(source, target);
            } else if ("csv".equals(in) && "json".equals(out)) {
                convertCsvToJson(source, target);
            } else {
                throw new ConversionException("UNSUPPORTED_PAIR: Unsupported structured format pair: " + in + " -> " + out);
            }
        } catch (IOException e) {
            throw new ConversionException("CORRUPTED_FILE: Could not parse input data: " + e.getMessage());
        }

        if (listener != null) listener.onProgress(100);
    }

    private void convertJsonToCsv(Path source, Path target) throws IOException {
        JsonNode tree = jsonMapper.readTree(source.toFile());
        if (tree.isArray() && tree.size() > 0) {
            JsonNode first = tree.get(0);
            CsvSchema.Builder schemaBuilder = CsvSchema.builder();
            Iterator<String> fieldNames = first.fieldNames();
            while (fieldNames.hasNext()) {
                schemaBuilder.addColumn(fieldNames.next());
            }
            CsvSchema schema = schemaBuilder.build().withHeader();
            csvMapper.writer(schema).writeValue(target.toFile(), tree);
        } else if (tree.isObject()) {
            CsvSchema.Builder schemaBuilder = CsvSchema.builder();
            Iterator<String> fieldNames = tree.fieldNames();
            while (fieldNames.hasNext()) {
                schemaBuilder.addColumn(fieldNames.next());
            }
            CsvSchema schema = schemaBuilder.build().withHeader();
            csvMapper.writer(schema).writeValue(target.toFile(), tree);
        } else {
            Files.writeString(target, tree.asText());
        }
    }

    private void convertCsvToJson(Path source, Path target) throws IOException {
        CsvSchema schema = CsvSchema.emptySchema().withHeader();
        Iterator<Map<?, ?>> it = csvMapper.readerFor(Map.class).with(schema).readValues(source.toFile());
        java.util.List<Map<?, ?>> list = new java.util.ArrayList<>();
        while (it.hasNext()) {
            list.add(it.next());
        }
        jsonMapper.writeValue(target.toFile(), list);
    }
}

