package com.code.acklet.converter.engine;

import com.code.acklet.converter.ConversionOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.file.Path;

public class StructureEngines {

    @Component
    @RequiredArgsConstructor
    public static class StructureDocxEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-docx"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "docx".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class StructureMdEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-md"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "md".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class StructureHtmlEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-html"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "html".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class StructureXlsxEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-xlsx"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "xlsx".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class StructureCsvEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-csv"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "csv".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class StructurePptxEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-pptx"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "pptx".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class StructureTxtEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "structure-txt"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "txt".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class OfficeDocEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "office-doc"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && "doc".equalsIgnoreCase(out); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }

    @Component
    @RequiredArgsConstructor
    public static class PdfboxImageEngine implements ConversionEngine {
        private final BaseStructureConversionEngine base;
        @Override public String getName() { return "pdfbox-image"; }
        @Override public boolean supports(String in, String out) { return "pdf".equalsIgnoreCase(in) && ("png".equalsIgnoreCase(out) || "jpg".equalsIgnoreCase(out)); }
        @Override public void convert(Path s, Path t, String in, String out, ConversionOptions opt, ProgressListener l) throws Exception {
            base.executeConversion(getName(), s, t, in, out, opt, l);
        }
    }
}

