---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: In Planning
---

# Learnings

## ✅ What Worked

- **qrcode.js is rock-solid** — consistent output, simple API, no surprises
- **CSS variables for theming** — easy dark/light mode, no complexity
- **Standalone components** — cleaner dependencies, no module nonsense
- **Service-first design** — pure functions, easy to test
- **Real-time preview** — drives engagement, feels responsive

## ❌ What Didn't

- **Over-engineering state** — RxJS BehaviorSubject was overkill; simple $event binding is enough
- **Premature optimization** — spent 2 hours on change detection before validating it was even slow

## 🔄 Iterate On

- **Logo overlay logic** — defer to Phase 2; pure canvas calls, no library
- **Batch generation** — consider async backend queue (Phase 3); frontend ZIP for Phase 2
- **Analytics** — keep optional, toggle off by default (privacy stance)

## Patterns to Reuse

- **ColorValidatorService approach** — WCAG formula simple, reusable for other tools
- **Component tree pattern** — orchestrator + dumb presenters works well
- **CSS variables system** — use for all Acklet tools (consistent theming)

---

**Last Updated**: 2026-10-20  
**Next Review**: After Phase 1 ships
