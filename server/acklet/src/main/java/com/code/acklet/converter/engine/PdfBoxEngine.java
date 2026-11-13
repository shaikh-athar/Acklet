package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.JodConverterService;
import com.code.acklet.converter.PageRangeParser;
import com.code.acklet.converter.exception.ConversionException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class PdfBoxEngine implements ConversionEngine {

    private final JodConverterService jodConverterService;

    @Override
    public String getName() {
        return "pdfbox";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();

        return ("pdf".equals(in) && ("png".equals(out) || "jpg".equals(out) || "jpeg".equals(out) || "txt".equals(out)))
                || (("png".equals(in) || "jpg".equals(in) || "jpeg".equals(in) || "webp".equals(in)) && "pdf".equals(out))
                || ("pptx".equals(in) && ("png".equals(out) || "jpg".equals(out) || "jpeg".equals(out)));
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        String in = inExt.toLowerCase().trim();
        String out = outExt.toLowerCase().trim();

        if (listener != null) listener.onProgress(15);

        if ("pdf".equals(in) && "txt".equals(out)) {
            convertPdfToText(source, target, options);
        } else if ("pdf".equals(in) && ("png".equals(out) || "jpg".equals(out) || "jpeg".equals(out))) {
            convertPdfToImage(source, target, out, options);
        } else if (("png".equals(in) || "jpg".equals(in) || "jpeg".equals(in) || "webp".equals(in)) && "pdf".equals(out)) {
            convertImageToPdf(source, target);
        } else if ("pptx".equals(in) && ("png".equals(out) || "jpg".equals(out) || "jpeg".equals(out))) {
            convertPptxToImage(source, target, out, options);
        } else {
            throw new ConversionException("UNSUPPORTED_PAIR: Unsupported conversion: " + in + " -> " + out);
        }

        if (listener != null) listener.onProgress(100);
    }

    private void convertPdfToText(Path sourcePdf, Path targetTxt, ConversionOptions options) throws IOException {
        try (PDDocument document = Loader.loadPDF(sourcePdf.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);

            if (options != null && options.getPageRange() != null && !options.getPageRange().isBlank()) {
                List<Integer> pages = PageRangeParser.parse(options.getPageRange(), document.getNumberOfPages());
                if (!pages.isEmpty()) {
                    stripper.setStartPage(pages.get(0));
                    stripper.setEndPage(pages.get(pages.size() - 1));
                }
            }

            String text = stripper.getText(document);
            Files.writeString(targetTxt, text, StandardCharsets.UTF_8);
        }
    }

    private void convertPdfToImage(Path sourcePdf, Path targetImg, String format, ConversionOptions options) throws IOException {
        String imgFmt = "jpg".equalsIgnoreCase(format) || "jpeg".equalsIgnoreCase(format) ? "jpg" : "png";
        try (PDDocument document = Loader.loadPDF(sourcePdf.toFile())) {
            PDFRenderer renderer = new PDFRenderer(document);
            int pageIndex = 0;

            if (options != null && options.getPageRange() != null && !options.getPageRange().isBlank()) {
                List<Integer> pages = PageRangeParser.parse(options.getPageRange(), document.getNumberOfPages());
                if (!pages.isEmpty()) {
                    pageIndex = Math.max(0, pages.get(0) - 1);
                }
            }

            BufferedImage image = renderer.renderImageWithDPI(pageIndex, 150);
            ImageIO.write(image, imgFmt, targetImg.toFile());
        }
    }

    private void convertImageToPdf(Path sourceImg, Path targetPdf) throws IOException {
        BufferedImage bimg = ImageIO.read(sourceImg.toFile());
        if (bimg == null) {
            throw new IOException("CORRUPTED_FILE: Unable to read image file.");
        }

        try (PDDocument document = new PDDocument()) {
            PDRectangle rect = new PDRectangle(bimg.getWidth(), bimg.getHeight());
            PDPage page = new PDPage(rect);
            document.addPage(page);

            PDImageXObject pdImage = PDImageXObject.createFromFile(sourceImg.toAbsolutePath().toString(), document);
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                contentStream.drawImage(pdImage, 0, 0, bimg.getWidth(), bimg.getHeight());
            }

            document.save(targetPdf.toFile());
        }
    }

    private void convertPptxToImage(Path sourcePptx, Path targetImg, String format, ConversionOptions options) throws Exception {
        Path tempPdf = Files.createTempFile("pptx-to-pdf-", ".pdf");
        try {
            jodConverterService.convert(sourcePptx, tempPdf, "pdf", options);
            convertPdfToImage(tempPdf, targetImg, format, options);
        } finally {
            Files.deleteIfExists(tempPdf);
        }
    }
}

