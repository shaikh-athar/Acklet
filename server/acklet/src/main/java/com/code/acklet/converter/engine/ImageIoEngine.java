package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import com.code.acklet.converter.exception.ConversionException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Set;

@Slf4j
@Component
public class ImageIoEngine implements ConversionEngine {

    private static final Set<String> SUPPORTED_INPUTS = Set.of("tiff", "tif", "bmp", "gif", "ico", "webp", "png", "jpg", "jpeg");
    private static final Set<String> SUPPORTED_OUTPUTS = Set.of("png", "jpg", "jpeg", "webp", "bmp", "gif");

    @Override
    public String getName() {
        return "image-io";
    }

    @Override
    public boolean supports(String inputType, String outputType) {
        if (inputType == null || outputType == null) return false;
        String in = inputType.toLowerCase().trim();
        String out = outputType.toLowerCase().trim();
        return SUPPORTED_INPUTS.contains(in) && SUPPORTED_OUTPUTS.contains(out);
    }

    @Override
    public void convert(Path source, Path target, String inExt, String outExt, ConversionOptions options, ProgressListener listener) throws Exception {
        if (listener != null) listener.onProgress(25);

        BufferedImage img = ImageIO.read(source.toFile());
        if (img == null) {
            throw new ConversionException("CORRUPTED_FILE: Could not read image file or format is unsupported.");
        }

        String targetFormat = "jpeg".equalsIgnoreCase(outExt) || "jpg".equalsIgnoreCase(outExt) ? "jpg" : outExt.toLowerCase();

        // If target is JPG and source has alpha channel, remove alpha
        if ("jpg".equalsIgnoreCase(targetFormat) && img.getColorModel().hasAlpha()) {
            BufferedImage rgbImg = new BufferedImage(img.getWidth(), img.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D g = rgbImg.createGraphics();
            g.drawImage(img, 0, 0, java.awt.Color.WHITE, null);
            g.dispose();
            img = rgbImg;
        }

        boolean written = ImageIO.write(img, targetFormat, target.toFile());
        if (!written) {
            // Fallback to png if direct write of target format failed
            ImageIO.write(img, "png", target.toFile());
        }

        if (listener != null) listener.onProgress(100);
    }
}

