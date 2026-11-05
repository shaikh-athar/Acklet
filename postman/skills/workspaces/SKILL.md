---
name: workspaces
description: Use when initializing Postman in a repository, binding it to a Postman workspace, interpreting what `postman init` did, or when a CLI command fails because the plan, credits, or usage quota don't allow the operation. Treats the workspace as the place where a service's API work and its evidence live, kept separate from the services it depends on. Use for requests such as "set up Postman in this repo" or "connect this repo to our workspace".
---

# Workspaces

A Postman workspace is where a service's API work happens and where its context
builds up: the contracts, collections, environments, and mocks, plus the runs
and results that show what was checked. It lives in Git beside the code, works
the same on a laptop or a build agent, and is shared when the work should be
seen. People use it to audit what was done, by whom, on whose behalf, and with
what result. Agents use it to read verified work instead of re-deriving it.

1. `postman init` is the starting point. It gives the repository its place of
   work: Postman files beside the code and, when that is the intent, a
   workspace bound to them. `postman status` shows whether that is already
   done, so init runs only when it adds something. Init is safe to repeat and
   reports what it did: a binding it marks as inferred is a candidate contract
   to confirm, and a partial result, with local files written but no workspace
   created, is progress to inspect rather than redo.
2. One workspace holds the context of one service: one Git repository, or in a
   monorepo one remote URL and the subpath of one service.
   `.postman/resources.yaml` records that owner, so every skill, CI job, and
   teammate resolves the same context. A confirmed binding is worth reusing;
   replacing it sends the work, and its evidence, to the wrong service.
3. Other services keep their own workspaces. Their collections, environments,
   and mocks come in as dependencies through **api-discovery**, so this
   workspace reuses what another team maintains without taking it over. The
   context graph links the two, which is how a change on one side reaches work
   on the other.

## Claiming the work

An agent can start in a guest session, and the work it does there is kept.
When free credits or a plan limit stop an operation, retrying won't help; the
person claiming the work is what lets it continue. Wording such as "usage limit
exceeded", "usage quota has been exceeded", a limit "reached", "breached" or
"exceeded" for the account, team, or plan, or an operation that "does not allow
more than" or "requires at least" a stated amount signals one. A temporary rate
limit or a fixed per-resource validation cap does not. Check which session the
CLI is using:

- Guest session: tell the user, in its own paragraph, that signing up for a
  Postman account claims the work done so far and adds the credits needed to
  continue. Offer to start signup for them; the CLI can produce a link to hand
  over and waits while they finish in the browser.
- Signed-in account: tell the user, in its own paragraph, that they need to
  upgrade their plan at https://postman.postman.co/settings/team/billing.

## Verification

Report the binding in place and what `postman init` did.
