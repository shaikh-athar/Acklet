package com.code.acklet.converter.generator;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.generator.model.PdfDocumentModel;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Slf4j
@Component
public class PdfboxImageGenerator {

    public GenerationResult generate(byte[] pdfBytes, String targetFormat, ConversionOptions options, PdfDocumentModel.FidelityModel fidelity) throws IOException {
        String format = "jpg".equalsIgnoreCase(targetFormat) || "jpeg".equalsIgnoreCase(targetFormat) ? "jpg" : "png";
        ImageType imageType = "jpg".equals(format) ? ImageType.RGB : ImageType.ARGB;

        // DPI option: 150 default, or 200, 300 if high fidelity requested
        float dpi = 150.0f;
        if (options != null && "exact".equalsIgnoreCase(options.getFidelity())) {
            dpi = 300.0f;
        } else if (options != null && "balanced".equalsIgnoreCase(options.getFidelity())) {
            dpi = 200.0f;
        }

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pageCount = document.getNumberOfPages();

            if (pageCount == 1) {
                BufferedImage image = renderer.renderImageWithDPI(0, dpi, imageType);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(image, format, baos);

                return GenerationResult.builder()
                        .data(baos.toByteArray())
                        .extension(format)
                        .mimeType("jpg".equals(format) ? "image/jpeg" : "image/png")
                        .fidelity(fidelity != null ? fidelity : new PdfDocumentModel.FidelityModel("high", java.util.List.of("High-resolution vector rasterization")))
                        .build();
            } else {
                // Multi-page: zip of images
                ByteArrayOutputStream zipBaos = new ByteArrayOutputStream();
                try (ZipOutputStream zos = new ZipOutputStream(zipBaos)) {
                    for (int i = 0; i < pageCount; i++) {
                        BufferedImage img = renderer.renderImageWithDPI(i, dpi, imageType);
                        ByteArrayOutputStream imgBaos = new ByteArrayOutputStream();
                        ImageIO.write(img, format, imgBaos);

                        ZipEntry entry = new ZipEntry(String.format("page_%03d.%s", i + 1, format));
                        zos.putNextEntry(entry);
                        zos.write(imgBaos.toByteArray());
                        zos.closeEntry();
                    }
                }

                return GenerationResult.builder()
                        .data(zipBaos.toByteArray())
                        .extension("zip")
                        .mimeType("application/zip")
                        .fidelity(fidelity != null ? fidelity : new PdfDocumentModel.FidelityModel("high", java.util.List.of("Multi-page raster package")))
                        .build();
            }
        }
    }
}

