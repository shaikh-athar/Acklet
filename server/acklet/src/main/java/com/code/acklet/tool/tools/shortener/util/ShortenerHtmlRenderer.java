package com.code.acklet.tool.tools.shortener.util;

import org.springframework.web.util.HtmlUtils;

public final class ShortenerHtmlRenderer {

    private ShortenerHtmlRenderer() {}

    /**
     * Renders the accessible, dual-theme password unlock page for protected short links.
     */
    public static String renderUnlockPage(String code, String errorMessage) {
        String safeCode = HtmlUtils.htmlEscape(code != null ? code : "");
        String errorHtml = "";
        if (errorMessage != null && !errorMessage.isBlank()) {
            String safeError = HtmlUtils.htmlEscape(errorMessage);
            errorHtml = """
              <div class="error-banner" role="alert" aria-live="polite">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>%s</span>
              </div>
            """.formatted(safeError);
        }

        return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Protected Link | Acklet</title>
  <style>
    :root {
      --bg: #FAFAF9;
      --card-bg: #FFFFFF;
      --text: #1C1917;
      --text-muted: #78716C;
      --border: #E7E5E4;
      --accent: #C98B4E;
      --accent-hover: #D49A5E;
      --accent-active: #B87C42;
      --accent-text: #1F1608;
      --error-bg: #FEF2F2;
      --error-text: #991B1B;
      --error-border: #FCA5A5;
      --ring: rgba(201, 139, 78, 0.4);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0C0A09;
        --card-bg: #1C1917;
        --text: #F5F5F4;
        --text-muted: #A8A29E;
        --border: #292524;
        --accent: #C98B4E;
        --accent-hover: #D49A5E;
        --accent-active: #B87C42;
        --accent-text: #1F1608;
        --error-bg: #450A0A;
        --error-text: #FCA5A5;
        --error-border: #7F1D1D;
        --ring: rgba(201, 139, 78, 0.4);
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      line-height: 1.5;
    }
    .card {
      width: 100%%;
      max-width: 420px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.25rem 2rem;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
    }
    .header {
      margin-bottom: 1.75rem;
      text-align: center;
    }
    .icon-wrapper {
      width: 48px;
      height: 48px;
      margin: 0 auto 1rem;
      border-radius: 12px;
      background: rgba(201, 139, 78, 0.12);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    h1 {
      font-size: 1.375rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.35rem;
    }
    .subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      background: var(--error-bg);
      color: var(--error-text);
      border: 1px solid var(--error-border);
      border-radius: 10px;
      font-size: 0.875rem;
      margin-bottom: 1.25rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
    }
    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    input[type="password"] {
      width: 100%%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      color: var(--text);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input[type="password"]:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--ring);
    }
    button[type="submit"] {
      width: 100%%;
      padding: 0.8rem 1.25rem;
      font-size: 0.9375rem;
      font-weight: 600;
      background: var(--accent);
      color: var(--accent-text);
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s, transform 0.05s;
    }
    button[type="submit"]:hover {
      background: var(--accent-hover);
    }
    button[type="submit"]:active {
      background: var(--accent-active);
      transform: translateY(1px);
    }
    .footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="header">
      <div class="icon-wrapper" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h1>Protected Link</h1>
      <p class="subtitle">Enter password to proceed</p>
    </div>

    %s

    <form action="/s/%s/unlock" method="POST">
      <div class="form-group">
        <label for="link-password">Password</label>
        <input type="password" id="link-password" name="password" required autofocus autocomplete="current-password" placeholder="Enter password">
      </div>
      <button type="submit">Unlock link</button>
    </form>

    <div class="footer">
      <span>Secured by Acklet</span>
    </div>
  </main>
</body>
</html>
""".formatted(errorHtml, safeCode);
    }

    /**
     * Renders a generic status page (Not Found, Expired, Limit Reached, Deactivated)
     * with immersive "Lost in Space" visual styling and relevant redirection destinations.
     */
    public static String renderStatusPage(String title, String message, int statusCode) {
        String safeTitle = HtmlUtils.htmlEscape(title != null ? title : "Link Unavailable");
        String safeMessage = HtmlUtils.htmlEscape(message != null ? message : "The requested link is unavailable.");

        return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>%s | Acklet</title>
  <style>
    :root {
      --bg: #FAFAF9;
      --card-bg: #FFFFFF;
      --text: #1C1917;
      --text-muted: #78716C;
      --border: #E7E5E4;
      --accent: #C98B4E;
      --accent-hover: #D49A5E;
      --accent-text: #1F1608;
      --chip-bg: #F5F5F4;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0C0A09;
        --card-bg: #1C1917;
        --text: #F5F5F4;
        --text-muted: #A8A29E;
        --border: #292524;
        --accent: #C98B4E;
        --accent-hover: #D49A5E;
        --accent-text: #1F1608;
        --chip-bg: rgba(255, 255, 255, 0.06);
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      line-height: 1.5;
    }
    .card {
      width: 100%%;
      max-width: 520px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2.25rem 2rem;
      text-align: center;
      box-shadow: 0 16px 40px -4px rgba(0, 0, 0, 0.16);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.1rem;
    }
    .gif-wrap {
      position: relative;
      width: 220px;
      height: 220px;
      max-width: 100%%;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: radial-gradient(circle at center, rgba(201, 139, 78, 0.12), rgba(0, 0, 0, 0.4));
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
    }
    .gif-wrap img {
      width: 100%%;
      height: 100%%;
      object-fit: cover;
      display: block;
    }
    .badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: var(--accent);
      background: rgba(201, 139, 78, 0.18);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid rgba(201, 139, 78, 0.35);
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    p.desc {
      font-size: 0.925rem;
      color: var(--text-muted);
      max-width: 440px;
      line-height: 1.55;
    }
    .actions {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.25rem;
      width: 100%%;
    }
    a.btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.35rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      background: var(--accent);
      color: var(--accent-text);
      border-radius: 10px;
      transition: background 0.15s, transform 0.15s;
    }
    a.btn-primary:hover {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
    a.btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-decoration: none;
      background: var(--chip-bg);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      transition: border-color 0.15s, color 0.15s;
    }
    a.btn-secondary:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .quick-links {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
      width: 100%%;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .quick-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }
    .chips a {
      font-size: 0.8rem;
      font-weight: 500;
      padding: 0.3rem 0.8rem;
      border-radius: 9999px;
      background: var(--chip-bg);
      border: 1px solid var(--border);
      color: var(--text);
      text-decoration: none;
      transition: all 0.15s;
    }
    .chips a:hover {
      border-color: var(--accent);
      color: var(--accent);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="gif-wrap">
      <img src="/assets/shortener/lost-in-space-404.gif" alt="Lost in Space" loading="eager" />
      <div class="badge">%d</div>
    </div>
    <h1>%s</h1>
    <p class="desc">%s</p>
    <div class="actions">
      <a href="/tools/tool-urlshortener" class="btn-primary">Create a link</a>
      <a href="/" class="btn-secondary">Acklet Hub</a>
    </div>
    <div class="quick-links">
      <span class="quick-label">Relevant tools</span>
      <div class="chips">
        <a href="/tools/tool-urlshortener">URL Shortener</a>
        <a href="/tools/tool-qr-generator">QR Generator</a>
        <a href="/tools/tool-online-clipboard">Online Clipboard</a>
      </div>
    </div>
  </main>
</body>
</html>
""".formatted(safeTitle, statusCode, safeTitle, safeMessage);
    }

    /**
     * Renders an accessible, dual-theme safe preview page for short links with + suffix.
     */
    public static String renderPreviewPage(String code, String targetUrl, boolean hasPassword, long clicks, String createdAt, String expiresAt) {
        String safeCode = HtmlUtils.htmlEscape(code != null ? code : "");
        String safeTarget = hasPassword ? "Password protected (destination hidden)" : HtmlUtils.htmlEscape(targetUrl != null ? targetUrl : "");
        String destinationDisplay = hasPassword ?
                """
                <div class="dest-box protected">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Password Protected</span>
                </div>
                """ :
                """
                <div class="dest-box">
                  <span class="dest-label">Destination</span>
                  <a href="%s" target="_blank" rel="noopener noreferrer" class="dest-link">%s</a>
                </div>
                """.formatted(safeTarget, safeTarget);

        return """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Preview /%s | Acklet</title>
  <style>
    :root {
      --bg: #FAFAF9;
      --card-bg: #FFFFFF;
      --text: #1C1917;
      --text-muted: #78716C;
      --border: #E7E5E4;
      --accent: #C98B4E;
      --accent-hover: #D49A5E;
      --accent-active: #B87C42;
      --accent-text: #1F1608;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0C0A09;
        --card-bg: #1C1917;
        --text: #F5F5F4;
        --text-muted: #A8A29E;
        --border: #292524;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      line-height: 1.5;
    }
    .card {
      width: 100%%;
      max-width: 480px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.25rem 2rem;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
    }
    .header {
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--accent);
      background: rgba(201, 139, 78, 0.12);
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: 1.375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.25rem;
    }
    .short-code {
      font-family: monospace;
      color: var(--accent);
    }
    .dest-box {
      margin: 1.25rem 0;
      padding: 1rem;
      border-radius: 12px;
      background: var(--bg);
      border: 1px solid var(--border);
      word-break: break-all;
    }
    .dest-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }
    .dest-link {
      font-size: 0.9375rem;
      font-weight: 500;
      color: var(--accent);
      text-decoration: none;
    }
    .dest-link:hover {
      text-decoration: underline;
    }
    .dest-box.protected {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .stats-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }
    .stats-row strong {
      color: var(--text);
    }
    .btn-row {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    a.btn-proceed {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%%;
      padding: 0.8rem 1.25rem;
      font-size: 0.9375rem;
      font-weight: 600;
      background: var(--accent);
      color: var(--accent-text);
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.15s;
    }
    a.btn-proceed:hover {
      background: var(--accent-hover);
    }
    a.btn-secondary {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%%;
      padding: 0.65rem 1.25rem;
      font-size: 0.875rem;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 10px;
      border: 1px solid var(--border);
      transition: color 0.15s, background 0.15s;
    }
    a.btn-secondary:hover {
      color: var(--text);
      background: var(--bg);
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="header">
      <div class="badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        Link Preview
      </div>
      <h1>Preview <span class="short-code">/%s</span></h1>
    </div>

    %s

    <div class="stats-row">
      <span>Clicks: <strong>%d</strong></span>
      <span>Status: <strong>Active</strong></span>
    </div>

    <div class="btn-row">
      <a href="/s/%s" class="btn-proceed">
        Proceed to link
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
      <a href="/" class="btn-secondary">Go to Acklet</a>
    </div>
  </main>
</body>
</html>
""".formatted(safeCode, safeCode, destinationDisplay, clicks, safeCode);
    }
}
