package com.code.acklet.tool.tools.qr.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.util.HtmlUtils;

public final class QrHtmlRenderer {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private QrHtmlRenderer() {}

    /**
     * Renders a secure, responsive, mobile-first HTML viewer for Plain Text payloads.
     */
    public static String renderTextViewer(String rawPayload, String code) {
        String safeHtmlText = HtmlUtils.htmlEscape(rawPayload != null ? rawPayload : "");
        String jsonEscapedText;
        try {
            jsonEscapedText = OBJECT_MAPPER.writeValueAsString(rawPayload != null ? rawPayload : "")
                    .replace("<", "\\u003c")
                    .replace(">", "\\u003e")
                    .replace("&", "\\u0026");
        } catch (Exception e) {
            jsonEscapedText = "\"\"";
        }
        String safeCode = code != null ? HtmlUtils.htmlEscape(code) : "download";

        String template = """
<!DOCTYPE html>
<html lang="en" dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Scanned Note | Acklet</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --btn-bg: #f1f5f9;
      --btn-text: #1e293b;
      --toast-bg: #0f172a;
      --toast-text: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #090d16;
        --card-bg: #131b2e;
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --border: #1e293b;
        --primary: #3b82f6;
        --primary-hover: #60a5fa;
        --btn-bg: #1e293b;
        --btn-text: #f1f5f9;
        --toast-bg: #f8fafc;
        --toast-text: #0f172a;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", "Noto Sans Gujarati", "Noto Sans Arabic", "Noto Sans SC", "Noto Sans JP", "Noto Color Emoji", "Apple Color Emoji", sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
    }
    .container {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 15px;
      color: var(--text);
      text-decoration: none;
    }
    .badge {
      font-size: 12px;
      font-weight: 600;
      padding: 3px 8px;
      background: var(--btn-bg);
      border-radius: 9999px;
      color: var(--text-muted);
    }
    .actions-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--btn-bg);
      color: var(--btn-text);
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      touch-action: manipulation;
    }
    .btn:hover {
      background: var(--border);
    }
    .btn-primary {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
    }
    .btn-primary:hover {
      background: var(--primary-hover);
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    }
    .note-content {
      font-size: 16px;
      line-height: 1.65;
      white-space: pre-wrap;
      word-break: break-word;
      user-select: text;
      font-variant-ligatures: normal;
    }
    footer {
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      padding: 16px 0 24px;
    }
    #toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--toast-bg);
      color: var(--toast-text);
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
      opacity: 0;
      pointer-events: none;
      z-index: 1000;
    }
    #toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="3" y="3" rx="1"/><rect width="8" height="8" x="13" y="3" rx="1"/><rect width="8" height="8" x="3" y="13" rx="1"/><path d="M14 14h.01"/><path d="M21 14h.01"/><path d="M14 21h.01"/><path d="M21 21h.01"/></svg>
        <span>Acklet QR</span>
      </div>
      <span class="badge">Dynamic Text</span>
    </header>

    <div class="actions-bar">
      <button id="copyBtn" class="btn" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        Copy
      </button>
      <button id="shareNotesBtn" class="btn btn-primary" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Share / Save to Notes
      </button>
      <button id="downloadBtn" class="btn" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        Download .txt
      </button>
    </div>
    <p class="share-hint">Hint: Tap &ldquo;Share / Save to Notes&rdquo; to pick Apple Notes, Google Keep, or any notepad app.</p>

    <main class="card">
      <div id="contentBlock" class="note-content" dir="auto">{{SAFE_HTML_TEXT}}</div>
    </main>

    <footer>
      Verified end-to-end QR link &bull; UTF-8 Encoded
    </footer>
  </div>

  <div id="toast" role="status" aria-live="polite"></div>

  <script>
    const NOTE_TEXT = {{JSON_ESCAPED_TEXT}};

    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2200);
    }

    document.getElementById('copyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(NOTE_TEXT);
        showToast('Copied to clipboard');
      } catch (e) {
        showToast('Failed to copy');
      }
    });

    const shareBtn = document.getElementById('shareNotesBtn');
    if (!navigator.share) {
      // Hide button if Web Share API is unsupported and fall back to Copy
      if (shareBtn) shareBtn.style.display = 'none';
    } else {
      shareBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: 'Note from QR',
            text: NOTE_TEXT
          });
        } catch (err) {
          if (err.name !== 'AbortError') {
            await navigator.clipboard.writeText(NOTE_TEXT);
            showToast('Note copied to clipboard');
          }
        }
      });
    }

    document.getElementById('downloadBtn').addEventListener('click', () => {
      try {
        // UTF-8 BOM (\\uFEFF) ensures standard notes apps detect UTF-8 properly
        const blob = new Blob(["\\uFEFF" + NOTE_TEXT], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'note_{{CODE}}.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Note downloaded');
      } catch (e) {
        showToast('Download failed');
      }
    });
  </script>
</body>
</html>
""";

        return template
                .replace("{{SAFE_HTML_TEXT}}", safeHtmlText)
                .replace("{{JSON_ESCAPED_TEXT}}", jsonEscapedText)
                .replace("{{CODE}}", safeCode);
    }

    /**
     * Renders a friendly status page for expired, disabled, or missing QR codes.
     */
    public static String renderStatusPage(String title, String message, int httpStatusCode) {
        String safeTitle = HtmlUtils.htmlEscape(title);
        String safeMessage = HtmlUtils.htmlEscape(message);

        String template = """
<!DOCTYPE html>
<html lang="en" dir="auto">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>{{TITLE}} | Acklet</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #090d16;
        --card-bg: #131b2e;
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --border: #1e293b;
        --primary: #3b82f6;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", "Noto Sans Gujarati", "Noto Sans Arabic", "Noto Sans SC", "Noto Sans JP", "Noto Color Emoji", "Apple Color Emoji", sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    }
    .icon {
      margin-bottom: 16px;
      display: inline-flex;
      padding: 12px;
      border-radius: 9999px;
      background: var(--bg);
      color: var(--text-muted);
    }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    p { font-size: 15px; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px; }
    .status-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      display: inline-block;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
    </div>
    <h1>{{TITLE}}</h1>
    <p>{{MESSAGE}}</p>
    <div class="status-badge">HTTP {{STATUS_CODE}}</div>
  </div>
</body>
</html>
""";

        return template
                .replace("{{TITLE}}", safeTitle)
                .replace("{{MESSAGE}}", safeMessage)
                .replace("{{STATUS_CODE}}", String.valueOf(httpStatusCode));
    }
}
