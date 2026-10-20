---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# FAQ

**Q: Why client-side only in Phase 1?**  
A: Speed to MVP + privacy advantage ("processed locally"). Backend complexity deferred to Phase 3.

**Q: Why qrcode.js and not ZXing/jsQR?**  
A: qrcode.js is lightest (18KB), no deps, simple API. ZXing/jsQR are heavier and designed for scanning.

**Q: Why emerald accent instead of ink-green?**  
A: Visual distinction between QR tool and Acklet main. Emerald is complementary, stands out.

**Q: Can users input vCard in Phase 1?**  
A: No, Phase 2. Phase 1 only: Text, URL, Email, Phone.

**Q: Does it upload to server?**  
A: No. All generation happens in browser. Zero server communication in Phase 1.

**Q: What's the max content length?**  
A: ~2,953 characters for alphanumeric QR v40 with L error correction.

**Q: What if content is too long?**  
A: User sees a warning/tooltip suggesting they increase error correction or shorten content.

**Q: How do I test accessibility?**  
A: Use keyboard navigation (Tab), screen reader (NVDA/JAWS), contrast checker tool, Lighthouse audit.
