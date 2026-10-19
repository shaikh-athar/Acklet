# Surfaces (module boundaries)

This monorepo has independent UI surfaces. Each owns its layout, theme, fonts, components and CSS.

| Surface | Owns (paths) | Look |
|---|---|---|
| Tools | client/apps/tools-hub/**, client/apps/tool-*/**, client/packages/tool-shell/** | ts-* shell, GOTH grayscale, one font, tool-shell Spartan helm |
| Acklet (portal + workspace) | client/src/** | Existing look. FROZEN unless the task names it |
| Shared (non-UI) | client/packages/shared/**, client/packages/tool-registry/** | URL utils + tool metadata only. No styles, no components |
| Backend | server/** | Never touched by UI tasks |
| Meta | .agents/**, **/AGENTS.md, scripts/**, docs/**, client/package.json | Rules, scripts, docs only |

## Rules
1. Every task names exactly ONE surface. Only that surface's paths may change.
2. Tools never import from client/src/**. Acklet never imports tool-shell internals. Shared packages contain no UI or CSS.
3. Never copy CSS or class names across surfaces. Recreate with the surface's own prefix (tools: ts-*, workspace: ws-*).
4. Global CSS (:root, element selectors, :focus-visible) must be scoped under the surface root class (.ts-root for tools).
5. Tailwind @source globs list only that surface's own paths.
6. Spartan: tools use the helm set inside tool-shell. Acklet keeps client/src/app/shared/helm. Never share or move helm between surfaces.
7. Before finishing: run `npm run check:scope -- <surface>`; git diff --stat must list only allowed paths. Revert anything else.
8. Never generate images, illustrations or assets. Use existing icons (ng-icon / lucide) only.
9. Do not add features, animations, pages or dependencies that the task did not ask for.
