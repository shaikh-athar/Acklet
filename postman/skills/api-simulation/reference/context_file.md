# `<name>.context.yaml`

The handoff record beside a simulation: `postman/simulations/checkout.sim.yaml`
gets `checkout.context.yaml`, and a foldered simulation keeps both in its folder.
`simulation create` and the Postman app write it from a fixed template,
`simulation update` renames it with the simulation, and `simulation delete`
removes it.

**Update the existing record without discarding prior claims or evidence.**
Replacing it with a fresh template loses findings and unresolved assumptions
while looking complete.

It carries what is believed about the services this simulation stands in for,
and what each belief rests on. **api-simulation** is how a simulation is run,
read and judged — its commands running clean is not yet the work being done.

## Its shape

The whole file is YAML under a fixed key schema. The key names and the `status`
vocabulary are fixed; the template carries each key's field schema in the
comments above it. A `null` is something nobody has established yet.

| Key | Holds |
| --- | --- |
| `purpose` | `stands_in_for` and `unblocks` — what the simulation stands in for and what work it unblocks. Record the intended purpose when known and refine it as you learn, distinguishing intended outcomes from demonstrated results. The members it serves, their route keys and the hosts they answer for are in the `.sim.yaml` beside it. |
| `assumptions` | What the code relies on about a dependency's behaviour. One claim per entry: `id`, `status`, `claim`, `reason`, `verification`, `source`, `updated_at`. |
| `fingerprints` | What the claims were written against — `id`, `date`, `commit`, `cli`. |

Everything else about this simulation lives where it already is: the members and
their origins in the `.sim.yaml`, the handlers in `postman/mocks/`, and how to
run any of it in **api-simulation**. Use this record to connect those details
to the assumptions and findings a later session needs.

Keep an entry when it helps a later session make a decision without repeating
the investigation, even if supporting details already exist in the repo.
For routes, request shapes, auth or config, link the file that holds them and
record the conclusion, evidence and uncertainty relevant to the caller.
Avoid copying details that can drift, and keep credentials out of this
committed record.

## What an assumption is

A claim about how a dependency behaves, which the code under test relies on:
what the caller is taken to be, which plan or permission is assumed, the order
calls go in, what gets retried, the shape of the data. A mock answers these
whether or not anyone checked, so its answer is a belief your code now carries.

For example, checkout may retry a payment after a timeout without knowing
whether the first attempt charged the customer. This illustrative entry
records the provider assumption that makes that retry safe; the paths and
run reference are examples, not evidence from this repository.

```yaml
- id: payment-retry-does-not-double-charge
  status: unknown
  claim: Retrying a payment for the same unchanged cart with identical payment
    details and the same idempotency key within 24 hours creates at most one
    charge at the payment provider, even if the first response times out.
  reason: Checkout relies on this guarantee to retry without double-charging
    the customer. The stand-in deduplicates payments by key, but that behavior
    was configured by us; a passing simulation does not establish the
    provider's retention window or handling of a retry after a timeout.
  verification: On 2026-10-28, ran the checkout timeout test. The stand-in
    recorded a successful charge, then delayed its response past the caller's
    timeout. Checkout retried with the same payment details and key, and the
    stand-in returned the original payment ID with one charge in its state.
    This demonstrates caller key reuse in this scenario. The provider's
    idempotency contract has not been checked; confirm its scope and retention
    window, including retries after an ambiguous outcome, before relying on
    this assumption for real payments.
  source: src/checkout/submit-payment.ts; postman/mocks/payments/handler.js;
    tests/checkout/payment-timeout.test.ts; runs/cart-payment-timeout-001
  updated_at: "2026-10-28"
```

One claim per entry. A sentence holding two claims is two entries, because
evidence can settle one and leave the other standing.

### `status`

| Value | Means | For example |
| --- | --- | --- |
| `supported` | Evidence supports the claim, within a stated scope. | The provider guarantees idempotency for 24 hours. |
| `contradicted` | Evidence provides a counterexample. | A timed-out request did create an order. |
| `unknown` | Available evidence cannot establish or reject it. | Key scope across token refresh is unspecified. |
| `conflicting` | Applicable sources disagree. | Documentation promises immediate revocation; a real probe observes continued access. |

`supported` is the one to be careful with: support comes with a scope, so the
claim says what that scope is. Name the operation, relevant conditions and
window the evidence covers. Narrow an overbroad claim before marking it
`supported`; a check at one point in a window does not establish behavior
throughout it.

`contradicted` and `conflicting` are findings to report, not states to route
around. A contradiction says the code relies on something untrue; a conflict
says two sources disagree and nobody has settled which governs — often a
contract promising one thing while the running service does another.

### `reason`, `verification` and `source`

Three different jobs, and keeping them apart is what makes a claim checkable.

`reason` is the judgment: why the evidence adds up to this status. It is the
field that earns its place on a `conflicting` or `unknown` claim, where the
status alone does not say what is unresolved.

`verification` is what was actually done and what it showed — a contract read,
a request made and its response, a handler inspected. Include when the
verification occurred and the revision or environment it covered, using a
fingerprint entry where applicable. Name what is still
planned or blocked and what would settle it, and say when a piece of evidence
has gone stale and why, since stale evidence stays as history but cannot
establish a current status.

Match the claim to the kind of evidence. A mock handler shows what the
stand-in models; a simulated run shows how the caller behaved under that
model. Neither independently establishes the real dependency's behavior.
Use provider evidence for that: distinguish a published contract's promise
from behavior observed against the real service, and retain the conditions
and scope of each. If only the mock supports a provider assumption, that
assumption remains `unknown` even when the caller test passes.

`source` is where to go and re-check it, so the next session can audit the
claim rather than take it on trust. Any of:

- a file and line range in this repo, where the code shows what it relies on;
- a request that was actually made and what came back — the target environment
  (stand-in or real service), sequence and status codes, with a retrievable
  test or run reference where available;
- the dependency's own code, or its published contract, read for the endpoint
  in question.

A claim is only as good as what it points at, so `source` carries the specific
thing, not its category: `api/policies/hasAccess.js:12-115` rather than "read
the code". A claim with nothing to point at is `unknown`.

Where two sources disagree, `verification` says what each one showed and
`status` is `conflicting` — that is the state a contract promising one thing
while the running service does another belongs in.

### `updated_at`

The day the entry was last written, `YYYY-MM-DD`. Set it when you add a claim,
and set it again whenever you change one — a new status, a fresh piece of
verification, a reworded claim.

This date tracks record maintenance. Rewording a claim does not refresh its
evidence: judge that from the date, revision and environment in `verification`
and its referenced fingerprint. Re-check when relevant behavior or conditions
have changed, or when the evidence's applicability is unclear.

Nothing enforces this. `simulation create` writes an empty list and no command
edits entries, so the field is only as true as the session that last wrote it.

## Where claims come from

Evidence first, claim second. Make the run or read the code, then write down
what it establishes — including the parts nobody had written down before, which
are the valuable half: a call order you did not expect, a dependency answering
something the code does not handle, a member never called at all.

Going the other way — writing the claim and then looking for something to back
it — is how a guess ends up marked `supported`. A claim written ahead of any
evidence is fine; it is `unknown` until something points at it.

## Fingerprints

What the claims were written against: `git rev-parse HEAD` and
`postman --version`. Append an entry when either differs, and say so when the
tree is dirty — a sha alone reads as a clean checkout.

Tie each verification to the fingerprint it used. Appending a new fingerprint
does not revalidate older claims. A changed commit or CLI is a reason to
assess whether relevant behavior changed; it does not by itself invalidate
all prior evidence.

## Reading it before you start

Read the claims relevant to the task before repeating dependency research.
Compare their scope and evidence with the code, configuration and provider
conditions your work depends on. Reuse findings that still apply, and inspect
the code you are changing to identify assumptions the change may affect.

Treat `supported` as conditional on that applicability, not as a permanent
guarantee. Revisit affected claims when relevant conditions change or their
evidence no longer establishes the current behavior. If current support is
unresolved, mark the claim `unknown` and preserve the prior evidence with the
reason it no longer settles the question. An `unknown` or `conflicting` claim
is worth investigating when the task depends on it; record what would settle
it if verification remains blocked.

Preserve unrelated claims and their history. A claim not exercised in this
session is not thereby contradicted or stale.
