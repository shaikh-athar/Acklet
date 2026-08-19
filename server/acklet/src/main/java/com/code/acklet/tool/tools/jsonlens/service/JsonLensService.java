package com.code.acklet.tool.tools.jsonlens.service;

import com.code.acklet.tool.tools.jsonlens.dto.JsonLensRequest;
import com.code.acklet.tool.tools.jsonlens.dto.JsonLensResponse;
import com.fasterxml.jackson.core.JsonLocation;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;

@Service
public class JsonLensService {

    private final ObjectMapper mapper = new ObjectMapper();

    public JsonLensResponse formatJson(JsonLensRequest request) {
        if (request.getJson() == null || request.getJson().trim().isEmpty()) {
            return JsonLensResponse.error("JSON payload cannot be empty", 1, 1);
        }

        try {
            JsonNode tree = mapper.readTree(request.getJson());

            if (request.isSortKeys()) {
                tree = sortJsonKeys(tree);
            }

            String output;
            if (request.isMinify()) {
                output = mapper.writeValueAsString(tree);
            } else {
                int indent = request.getIndent() > 0 ? request.getIndent() : 2;
                output = mapper.writerWithDefaultPrettyPrinter().writeValueAsString(tree);
                if (indent != 2) {
                    String customIndent = " ".repeat(indent);
                    output = output.replace("  ", customIndent);
                }
            }

            int lineCount = output.split("\r\n|\r|\n").length;
            long byteSize = output.getBytes(StandardCharsets.UTF_8).length;

            return JsonLensResponse.success(output, lineCount, byteSize);

        } catch (JsonProcessingException e) {
            JsonLocation loc = e.getLocation();
            int line = loc != null ? loc.getLineNr() : 1;
            int col = loc != null ? loc.getColumnNr() : 1;
            String msg = e.getOriginalMessage();
            return JsonLensResponse.error(msg != null ? msg : e.getMessage(), line, col);
        } catch (Exception e) {
            return JsonLensResponse.error(e.getMessage(), 1, 1);
        }
    }

    private JsonNode sortJsonKeys(JsonNode node) {
        if (node.isObject()) {
            ObjectNode objectNode = (ObjectNode) node;
            ObjectNode sortedNode = mapper.createObjectNode();

            List<String> fieldNames = new ArrayList<>();
            Iterator<String> iterator = objectNode.fieldNames();
            while (iterator.hasNext()) {
                fieldNames.add(iterator.next());
            }
            Collections.sort(fieldNames);

            for (String fieldName : fieldNames) {
                sortedNode.set(fieldName, sortJsonKeys(objectNode.get(fieldName)));
            }
            return sortedNode;
        } else if (node.isArray()) {
            ArrayNode arrayNode = (ArrayNode) node;
            ArrayNode newArrayNode = mapper.createArrayNode();
            for (JsonNode item : arrayNode) {
                newArrayNode.add(sortJsonKeys(item));
            }
            return newArrayNode;
        }
        return node;
    }
}
