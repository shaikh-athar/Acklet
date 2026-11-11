package com.code.acklet.converter;

import lombok.Getter;

import java.util.*;

/**
 * Supported file formats and their valid conversion input/output pairs.
 */
@Getter
public enum ConversionFormat {

    // ── Word Processing Documents ──────────────────────────────
    DOCX("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Microsoft Word (.docx)", FormatFamily.DOCUMENT,
            Set.of("pdf", "doc", "odt", "rtf", "txt", "html")),
    DOC("doc", "application/msword", "Microsoft Word 97-2004 (.doc)", FormatFamily.DOCUMENT,
            Set.of("pdf", "docx", "odt", "rtf", "txt", "html")),
    ODT("odt", "application/vnd.oasis.opendocument.text", "OpenDocument Text (.odt)", FormatFamily.DOCUMENT,
            Set.of("pdf", "docx", "doc", "rtf", "txt", "html")),
    RTF("rtf", "application/rtf", "Rich Text Format (.rtf)", FormatFamily.DOCUMENT,
            Set.of("pdf", "docx", "doc", "odt", "txt", "html")),
    TXT("txt", "text/plain", "Plain Text (.txt)", FormatFamily.DOCUMENT,
            Set.of("pdf", "docx", "odt", "html")),
    HTML("html", "text/html", "HTML Document (.html)", FormatFamily.DOCUMENT,
            Set.of("pdf", "docx", "odt", "txt")),

    // ── Spreadsheets ──────────────────────────────────────────
    XLSX("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Microsoft Excel (.xlsx)", FormatFamily.SPREADSHEET,
            Set.of("pdf", "xls", "ods", "csv", "html")),
    XLS("xls", "application/vnd.ms-excel", "Microsoft Excel 97-2004 (.xls)", FormatFamily.SPREADSHEET,
            Set.of("pdf", "xlsx", "ods", "csv", "html")),
    ODS("ods", "application/vnd.oasis.opendocument.spreadsheet", "OpenDocument Spreadsheet (.ods)", FormatFamily.SPREADSHEET,
            Set.of("pdf", "xlsx", "xls", "csv", "html")),
    CSV("csv", "text/csv", "Comma-Separated Values (.csv)", FormatFamily.SPREADSHEET,
            Set.of("pdf", "xlsx", "xls", "ods")),
    TSV("tsv", "text/tab-separated-values", "Tab-Separated Values (.tsv)", FormatFamily.SPREADSHEET,
            Set.of("pdf", "xlsx", "xls", "ods", "csv")),

    // ── Presentations ─────────────────────────────────────────
    PPTX("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Microsoft PowerPoint (.pptx)", FormatFamily.PRESENTATION,
            Set.of("pdf", "ppt", "odp")),
    PPT("ppt", "application/vnd.ms-powerpoint", "Microsoft PowerPoint 97-2004 (.ppt)", FormatFamily.PRESENTATION,
            Set.of("pdf", "pptx", "odp")),
    ODP("odp", "application/vnd.oasis.opendocument.presentation", "OpenDocument Presentation (.odp)", FormatFamily.PRESENTATION,
            Set.of("pdf", "pptx", "ppt")),

    // ── Graphics & Drawings ───────────────────────────────────
    ODG("odg", "application/vnd.oasis.opendocument.graphics", "OpenDocument Drawing (.odg)", FormatFamily.DRAWING,
            Set.of("pdf", "png", "svg")),

    // ── Output Targets ────────────────────────────────────────
    PDF("pdf", "application/pdf", "Portable Document Format (.pdf)", FormatFamily.DOCUMENT,
            Set.of("docx", "doc", "md", "html", "xlsx", "csv", "pptx", "txt", "png", "jpg")),
    PNG("png", "image/png", "PNG Image (.png)", FormatFamily.IMAGE,
            Collections.emptySet()),
    JPEG("jpeg", "image/jpeg", "JPEG Image (.jpg/.jpeg)", FormatFamily.IMAGE,
            Collections.emptySet()),
    SVG("svg", "image/svg+xml", "Scalable Vector Graphics (.svg)", FormatFamily.IMAGE,
            Collections.emptySet());

    public enum FormatFamily {
        DOCUMENT,
        SPREADSHEET,
        PRESENTATION,
        DRAWING,
        IMAGE
    }

    private final String extension;
    private final String mimeType;
    private final String displayName;
    private final FormatFamily family;
    private final Set<String> targetExtensions;

    private static final Map<String, ConversionFormat> BY_EXTENSION = new HashMap<>();
    private static final Map<String, ConversionFormat> BY_MIME = new HashMap<>();

    static {
        for (ConversionFormat format : values()) {
            BY_EXTENSION.put(format.extension.toLowerCase(Locale.ROOT), format);
            BY_MIME.put(format.mimeType.toLowerCase(Locale.ROOT), format);
        }
        // Aliases
        BY_EXTENSION.put("jpg", JPEG);
        BY_EXTENSION.put("htm", HTML);
        BY_MIME.put("text/rtf", RTF);
        BY_MIME.put("image/jpg", JPEG);
        BY_MIME.put("application/x-zip-compressed", DOCX);
    }

    ConversionFormat(String extension, String mimeType, String displayName, FormatFamily family, Set<String> targetExtensions) {
        this.extension = extension;
        this.mimeType = mimeType;
        this.displayName = displayName;
        this.family = family;
        this.targetExtensions = targetExtensions;
    }

    /**
     * Resolves a format by file extension (e.g., "docx" or ".docx").
     */
    public static Optional<ConversionFormat> fromExtension(String ext) {
        if (ext == null || ext.isBlank()) {
            return Optional.empty();
        }
        String cleanExt = ext.trim().toLowerCase(Locale.ROOT);
        if (cleanExt.startsWith(".")) {
            cleanExt = cleanExt.substring(1);
        }
        return Optional.ofNullable(BY_EXTENSION.get(cleanExt));
    }

    /**
     * Resolves a format by MIME type.
     */
    public static Optional<ConversionFormat> fromMimeType(String mimeType) {
        if (mimeType == null || mimeType.isBlank()) {
            return Optional.empty();
        }
        String cleanMime = mimeType.trim().toLowerCase(Locale.ROOT);
        int semicolonIdx = cleanMime.indexOf(';');
        if (semicolonIdx > 0) {
            cleanMime = cleanMime.substring(0, semicolonIdx).trim();
        }
        return Optional.ofNullable(BY_MIME.get(cleanMime));
    }

    /**
     * Checks if a conversion from source format to target format is supported.
     */
    public static boolean isConversionSupported(ConversionFormat source, ConversionFormat target) {
        if (source == null || target == null) {
            return false;
        }
        if (source == target) {
            return false;
        }
        return source.targetExtensions.contains(target.extension);
    }

    /**
     * Gets all valid output formats for a given source format.
     */
    public static List<ConversionFormat> getSupportedOutputs(ConversionFormat source) {
        if (source == null) {
            return Collections.emptyList();
        }
        List<ConversionFormat> outputs = new ArrayList<>();
        for (String targetExt : source.targetExtensions) {
            fromExtension(targetExt).ifPresent(outputs::add);
        }
        return Collections.unmodifiableList(outputs);
    }
}

