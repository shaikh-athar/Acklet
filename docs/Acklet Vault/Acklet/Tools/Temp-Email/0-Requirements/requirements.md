# Temporary Email — Requirements & API Specifications

## 1. Functional Scope
1. **Address Generation**:
   - Query Mail.tm `/domains?page=1` for active domains.
   - Generate cryptographically secure random credentials in client memory (`crypto.getRandomValues`).
   - Create account via `POST /accounts`.
   - Obtain JWT authentication token via `POST /token`.
2. **Inbox Monitoring**:
   - Periodic polling of `GET /messages?page=1` with Bearer token.
   - Page Visibility API awareness: throttle/pause polling when tab is hidden to adhere to Mail.tm rate limits (`30 req/min`).
3. **Email Retrieval**:
   - Detailed message loading via `GET /messages/{id}`.
   - Automatic status update via `PATCH /messages/{id}` with `{"seen": true}`.
   - Deletion of individual messages via `DELETE /messages/{id}`.
4. **OTP & Verification Link Extraction**:
   - Client-side heuristic parser identifying 4-8 digit numeric codes and uppercase alphanumeric tokens.
   - Exclusion of 4-digit years (1950-2040) and repeating sequences.
   - Extraction of account confirmation links, excluding social and unsubscribe links.
5. **Multi-Inbox Support**:
   - Maintain up to 5 concurrent accounts in browser `localStorage`.
   - 1-click active inbox switching.
6. **Privacy & Security**:
   - Sandboxed iframe HTML rendering with `sandbox="allow-popups allow-popups-to-escape-sandbox"` (no scripts, no same-origin).
   - Neutralization of tracking pixels / 1x1 remote beacons by default.

---

## Related Documents
- [README.md](../README.md) — Tool Overview.
- [../2-Implementation/service-design.md](../2-Implementation/service-design.md) — Service architecture.

