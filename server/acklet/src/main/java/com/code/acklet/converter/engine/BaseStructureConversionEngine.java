package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.generator.*;
import com.code.acklet.converter.generator.model.PdfDocumentModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
@RequiredArgsConstructor
public class BaseStructureConversionEngine {

    private final PdfStructureClient structureClient;
    private final DocxGenerator docxGenerator;
    private final MarkdownGenerator markdownGenerator;
    private final HtmlGenerator htmlGenerator;
    private final TxtGenerator txtGenerator;
    private final XlsxGenerator xlsxGenerator;
    private final CsvGenerator csvGenerator;
    private final PptxGenerator pptxGenerator;
    private final DocGenerator docGenerator;
    private final PdfboxImageGenerator imageGenerator;

    public GenerationResult executeConversion(String engineName, Path source, Path target, String inExt, String outExt,
                                             ConversionOptions options, ProgressListener listener) throws Exception {
        if (listener != null) listener.onProgress(20);

        byte[] sourceBytes = Files.readAllBytes(source);

        // Image rasterization does not require document model extraction
        if ("pdfbox-image".equalsIgnoreCase(engineName) || "png".equalsIgnoreCase(outExt) || "jpg".equalsIgnoreCase(outExt)) {
            if (listener != null) listener.onProgress(50);
            GenerationResult imgRes = imageGenerator.generate(sourceBytes, outExt, options, null);
            Files.write(target, imgRes.getData());
            if (listener != null) listener.onProgress(100);
            return imgRes;
        }

        PdfDocumentModel model = structureClient.extractStructure(
                sourceBytes,
                options != null && options.isOcr(),
                0.85
        );

        if (listener != null) listener.onProgress(60);

        GenerationResult result;
        switch (outExt.toLowerCase()) {
            case "docx" -> result = docxGenerator.generate(model);
            case "md" -> result = markdownGenerator.generate(model);
            case "html" -> result = htmlGenerator.generate(model);
            case "txt" -> result = txtGenerator.generate(model);
            case "xlsx" -> result = xlsxGenerator.generate(model);
            case "csv" -> result = csvGenerator.generate(model);
            case "pptx" -> result = pptxGenerator.generate(model);
            case "doc" -> result = docGenerator.generate(model);
            default -> throw new IllegalArgumentException("Unsupported structure target format: " + outExt);
        }

        Files.write(target, result.getData());
        if (listener != null) listener.onProgress(100);
        return result;
    }
}
