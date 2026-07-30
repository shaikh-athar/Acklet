export interface FeatureFlags {
  /** 7-day persistent session remember-me checkbox on login page */
  rememberMe: boolean;
  /** Hint banner showing last logged-in account email and OAuth provider */
  lastLoginAccountHint: boolean;
  /** Enterprise HttpOnly cookies, silent token refresh, token rotation, and active session manager */
  enterpriseSecurity: boolean;
  /** Redis + Bucket4j rate limiting */
  rateLimitingEnabled: boolean;
  /** Cloudflare Turnstile CAPTCHA verification */
  captchaEnabled: boolean;
  /** Asymmetric RS256 JWT signing and JWKS endpoint */
  rs256Jwt: boolean;
  /** Structured security event audit logging */
  securityAuditLogging: boolean;
  /** Sensitive action re-authentication prompt */
  stepUpReauth: boolean;
  /** Pre-expiration session timeout warning countdown modal */
  sessionTimeoutWarning: boolean;
  /** GitHub OAuth, repo import, and automated synchronization */
  githubSync: boolean;
  /** AI summary generation, SEO, and vector embeddings */
  aiEnrichment: boolean;
  /** Publisher workspace dashboard for tool submissions */
  publisherWorkspace: boolean;
  /** Admin moderation workspace and system health dashboard */
  adminWorkspace: boolean;
  /** Community discussions and thread replies */
  communityDiscussions: boolean;
  /** Blog articles and engineering insights */
  blogArticles: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  rememberMe: true,
  lastLoginAccountHint: true,
  enterpriseSecurity: true,
  rateLimitingEnabled: false,
  captchaEnabled: true,
  rs256Jwt: true,
  securityAuditLogging: true,
  stepUpReauth: true,
  sessionTimeoutWarning: true,
  githubSync: true,
  aiEnrichment: true,
  publisherWorkspace: true,
  adminWorkspace: true,
  communityDiscussions: true,
  blogArticles: true,
};

