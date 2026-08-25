# JSONLens — Premium JSON Developer Workspace

## ROLE

You are a senior product designer, UX architect, and frontend engineer building a production-quality developer tool for **Acklet**.

You are not creating a generic JSON formatter.

You are creating **JSONLens**, a premium JSON inspection and transformation workspace designed for developers who frequently work with API responses, configuration files, logs, payloads, SDK responses, and deeply nested JSON.

The product must feel like a serious developer utility that someone would bookmark and use every day.

Use **json.site only as a functional reference** for concepts such as:

* real-time JSON formatting
* split editor/viewer workflows
* configurable indentation
* light/dark themes
* local history
* multiple viewing modes
* JSON file upload/download
* JSON sharing

Do **NOT** copy its visual design, layout, branding, spacing, colors, component styling, or interaction patterns.

JSONLens must have its own visual identity and interaction system.

---

# 1. PRODUCT VISION

Product name:

**JSONLens**

Brand:

**JSONLens by Acklet**

Primary positioning:

> **Format. Validate. Inspect. Understand JSON.**

Alternative supporting line:

> Turn messy JSON into something you can actually understand.

JSONLens should solve four jobs extremely well:

1. **Make JSON readable**
2. **Tell me whether my JSON is valid**
3. **Help me understand large/deep JSON structures**
4. **Help me transform and reuse the data**

This should feel closer to a lightweight developer IDE than a basic online formatter.

---

# 2. CORE UX PRINCIPLE

The most important principle:

> The user should never have to think about how the tool works.

The workflow should be:

```text
Paste / Drop / Upload JSON
        ↓
Instant validation
        ↓
Instant formatting
        ↓
Explore / inspect / transform
        ↓
Copy / Download / Convert
```

Do not create unnecessary onboarding.

Do not force sign-in.

Do not make the user navigate through multiple pages for basic JSON operations.

The primary workflow must happen on one screen.

---

# 3. PRIMARY USER

Design primarily for:

* Backend developers
* Frontend developers
* API developers
* QA engineers
* DevOps engineers
* Data engineers
* Students learning APIs
* Developers debugging API responses

Typical input:

```json
{"user":{"id":42,"name":"Athar","roles":["admin","developer"]}}
```

Typical user expectation:

> "Make this readable."

But advanced users should be able to continue into:

* Tree inspection
* Search
* Statistics
* JSONPath
* Code generation
* Conversion
* Diff
* Graph visualization

---

# 4. DESIGN DIRECTION

## Overall aesthetic

Create a **premium developer-tool interface**.

Think:

* modern IDE
* GitHub
* Linear
* Raycast
* Vercel
* modern API clients

But do not directly copy any of them.

The UI should feel:

* precise
* technical
* calm
* fast
* minimal
* information-dense
* highly polished

Avoid:

* giant marketing gradients
* excessive glassmorphism
* oversized cards
* childish illustrations
* unnecessary animations
* excessive rounded containers
* generic SaaS dashboard appearance

This is a developer workspace.

It should prioritize **information density and usability**.

---

# 5. COLOR SYSTEM

Use a neutral developer-oriented color system.

Dark mode should be the primary experience.

Recommended direction:

### Dark

Background:

```text
#0B0D10
```

Primary surface:

```text
#111419
```

Secondary surface:

```text
#171B21
```

Borders:

```text
#252B33
```

Primary text:

```text
#E8EAED
```

Secondary text:

```text
#8B949E
```

Success:

```text
#3FB950
```

Error:

```text
#F85149
```

Warning:

```text
#D29922
```

Accent:

Use one restrained Acklet accent rather than a rainbow palette.

Do not make every button colorful.

---

# 6. TYPOGRAPHY

Use a developer-friendly font system.

Recommended:

```text
Inter
```

for UI.

Use:

```text
JetBrains Mono
```

or

```text
Geist Mono
```

for JSON/editor content.

JSON must feel like code.

Use strong typographic hierarchy.

Do not use giant typography inside the actual workspace.

---

# 7. RESPONSIVE DESIGN

The primary target is desktop.

Optimize for:

```text
1440 × 900
1280 × 800
1920 × 1080
```

Also support:

```text
1024px tablet
768px tablet
mobile
```

Desktop should provide the full workspace.

On mobile:

* stack panels
* use tabs
* collapse secondary tools
* keep Format / Validate / Copy accessible
* do not attempt to squeeze two full editors side-by-side

---

# 8. APPLICATION SHELL

The entire application should use a compact application shell.

Structure:

```text
┌───────────────────────────────────────────────────────────────┐
│ Acklet / JSONLens                         Theme  Settings     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                     JSONLens                                  │
│              Format · Validate · Inspect                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Workspace Toolbar                                       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────┬────────────────────────────────┐ │
│  │                         │                                │ │
│  │     INPUT EDITOR        │       INSPECTOR / OUTPUT       │ │
│  │                         │                                │ │
│  │                         │                                │ │
│  │                         │                                │ │
│  └─────────────────────────┴────────────────────────────────┘ │
│                                                               │
│  Valid JSON · 42 keys · 8.2 KB · Depth 5                     │
└───────────────────────────────────────────────────────────────┘
```

However, do NOT make the whole screen look like a collection of cards.

The editor should feel like one continuous workspace.

---

# 9. TOP NAVIGATION

Top bar:

Left:

```text
Acklet
/
JSONLens
```

Use a subtle breadcrumb.

Center/right:

```text
Format
Minify
Validate
Fix
```

Then utility actions:

```text
History
Settings
Theme
```

Do not overcrowd the navigation.

The primary JSON actions belong closer to the editor.

---

# 10. HERO AREA

Keep the hero extremely compact.

Do NOT waste 30–40% of the screen with marketing copy.

Use:

### JSONLens

**Format, validate, and inspect JSON without leaving your browser.**

Small privacy badge:

```text
● 100% client-side
Your JSON never leaves your device
```

This privacy statement should be visually noticeable but not obnoxious.

Do not claim client-side processing unless the implementation actually guarantees it.

---

# 11. EMPTY STATE

When no JSON exists, the workspace should not look empty and dead.

Show:

```text
Drop JSON here

or

Paste JSON

or

Open .json file
```

Secondary actions:

```text
Try example
```

Examples:

```text
API Response
Nested Object
Large Array
Configuration
```

Example JSON should be inserted locally.

Do not require network requests.

---

# 12. INPUT EXPERIENCE

The input editor is the heart of JSONLens.

Use a proper code editor experience.

Preferred implementation:

* Monaco Editor or equivalent
* syntax highlighting
* line numbers
* bracket matching
* indentation
* folding
* search
* selection
* keyboard shortcuts
* word wrapping option

Do NOT create a simple `<textarea>` pretending to be a code editor.

---

# 13. INPUT HEADER

Input header:

```text
INPUT

JSON

[Upload] [Paste] [Clear]
```

Right side:

```text
Auto Validate ●
```

When JSON is valid:

```text
✓ Valid JSON
```

When invalid:

```text
× Invalid JSON
```

The status should update intelligently.

Do not flash error messages on every keystroke while the user is typing.

Debounce validation.

---

# 14. ERROR EXPERIENCE

This is one of the most important differentiators.

Never show only:

```text
Unexpected token } in JSON at position 47
```

Instead show:

```text
Invalid JSON

Line 12 · Column 18

Trailing comma before the closing brace.

Remove the comma after "email".
```

Provide:

```text
Go to error
```

Clicking it must move the editor cursor to the exact location.

If possible, underline the problematic region.

---

# 15. ERROR PANEL

When invalid:

Show a compact error panel beneath the editor toolbar.

Example:

```text
× Invalid JSON

Line 12, Column 18

Trailing comma before closing object.

[Go to error]     [Try Fix]
```

Do not cover the entire workspace with a giant error banner.

---

# 16. SMART FIX

Provide:

```text
Fix JSON
```

But do NOT silently mutate user data.

Before applying a fix, explain what will change.

Example:

```text
3 repairable issues found

• Trailing comma
• Single quotes
• Unquoted property name

[Apply fixes]
[Review changes]
```

For safety, preserve the original input until the user confirms.

---

# 17. MAIN ACTION BAR

Create a highly polished action toolbar.

Primary:

```text
Format
```

Secondary:

```text
Minify
Validate
Fix
```

Utility:

```text
Copy
Download
```

More:

```text
...
```

Do not make every action a large filled button.

Use hierarchy.

Example:

```text
[ Format ]  Minify  Validate  Fix       Copy  Download  ⋯
```

---

# 18. INDENTATION CONTROL

Provide:

```text
Indent:
2 spaces
```

Dropdown:

```text
1 space
2 spaces
3 spaces
4 spaces
Tabs
```

Remember the preference locally.

---

# 19. OUTPUT / INSPECTOR

The right side is not merely "output."

Call it:

**Inspector**

This is a key product decision.

Tabs:

```text
Formatted
Tree
Table
Stats
```

Future-ready tabs:

```text
Graph
JSONPath
Diff
```

Do not expose every advanced feature if it isn't implemented.

Only display functional tabs.

---

# 20. FORMATTED VIEW

Formatted view should display the parsed JSON beautifully.

Features:

* syntax highlighting
* line numbers
* folding
* copy
* download
* search
* expand/collapse
* go to line

Header:

```text
FORMATTED

[Copy] [Download] [Expand All] [Collapse All]
```

---

# 21. TREE VIEW

Tree view should be one of the strongest features.

Example:

```text
▼ root
  ▼ user
    ├─ id        42
    ├─ name      "Athar"
    ├─ active    true
    ▼ roles
      ├─ "admin"
      └─ "developer"
```

Use distinct visual treatment for:

* object
* array
* string
* number
* boolean
* null

Show metadata when useful:

```text
user
object · 6 keys
```

Do not make the tree visually noisy.

---

# 22. TREE INTERACTION

Support:

* Expand node
* Collapse node
* Expand all
* Collapse all
* Copy value
* Copy JSONPath
* Edit value
* Delete node
* Search within tree

Context menu:

```text
Copy value
Copy JSON
Copy JSONPath
Expand children
Collapse children
```

---

# 23. TABLE VIEW

For array-heavy JSON, provide a useful table representation.

Example:

```text
┌────┬───────────┬───────┬────────────┐
│ #  │ name      │ age   │ active     │
├────┼───────────┼───────┼────────────┤
│ 1  │ Alice     │ 28    │ true       │
│ 2  │ Bob       │ 31    │ false      │
│ 3  │ Charlie   │ 25    │ true       │
└────┴───────────┴───────┴────────────┘
```

If the JSON isn't naturally tabular, gracefully explain:

```text
This JSON structure isn't naturally tabular.
Try Tree view instead.
```

Do not force malformed tables.

---

# 24. STATS PANEL

Create a compact JSON intelligence dashboard.

Show:

```text
Size
8.4 KB

Keys
42

Values
67

Depth
6

Arrays
8

Objects
13

Strings
31

Numbers
12

Booleans
7

Nulls
4
```

Also show:

```text
Minified size
6.1 KB

Whitespace overhead
2.3 KB
```

Use simple visual indicators.

Do not turn this into a generic analytics dashboard.

This is JSON analysis.

---

# 25. DUPLICATE KEY DETECTION

Detect duplicate object keys.

Example:

```json
{
  "name": "Alice",
  "name": "Bob"
}
```

Display:

```text
⚠ Duplicate key

"name" appears multiple times in this object.

Depending on the parser, one value may overwrite another.
```

This is valuable because many basic formatters ignore this problem.

---

# 26. SEARCH

Add:

```text
Search JSON
```

Keyboard shortcut:

```text
Ctrl/Cmd + F
```

Search both:

* keys
* values

Show:

```text
7 matches
```

Allow:

```text
Next
Previous
```

For Tree view, highlight matching nodes.

---

# 27. JSONPATH

Design the product architecture so JSONPath can be added.

Future UI:

```text
JSONPath

$.users[0].profile.name

[ Run ]

Result:
"Alice"
```

Do not build fake functionality.

If not implemented, don't display it as available.

---

# 28. CODE GENERATOR

This is a major differentiator.

Provide:

```text
Generate Code
```

Languages:

```text
TypeScript
Python
Go
Java
Kotlin
C#
Rust
```

For v1, prioritize:

```text
TypeScript
Python
Go
```

Example:

```text
TypeScript

interface User {
  id: number;
  name: string;
  active: boolean;
}
```

Include:

```text
Copy
Download
```

---

# 29. CONVERSION

Create a transformation menu:

```text
Convert
```

Options:

```text
JSON → YAML
JSON → CSV
JSON → XML
```

And future-ready:

```text
YAML → JSON
XML → JSON
CSV → JSON
```

Do not overload the primary toolbar.

Conversion belongs in a secondary menu or command palette.

---

# 30. FILE SUPPORT

Support:

```text
Open .json
```

Drag-and-drop:

```text
Drop JSON file anywhere in workspace
```

After loading:

```text
✓ Loaded users.json
42 KB
```

Download:

```text
Download JSON
```

Suggested filename:

```text
formatted.json
```

If original filename exists:

```text
users.formatted.json
```

---

# 31. LARGE FILE UX

Do not freeze the browser unnecessarily.

Design the architecture for large JSON files.

For large inputs:

```text
Large JSON detected · 18.4 MB
```

Show:

```text
Processing...
```

Use Web Workers where appropriate.

Avoid blocking the main UI thread.

Never pretend that "100MB supported" means every device can process 100MB instantly.

Performance should degrade gracefully.

---

# 32. PRIVACY

This is a major product feature.

Show:

```text
🔒 Processed entirely in your browser

Your JSON is never uploaded to Acklet.
```

Add a small "How?" interaction.

Explain:

```text
Formatting, validation, tree parsing and conversions happen locally
on your device.
```

Only make claims that are technically true.

If a future feature requires server-side processing, clearly distinguish it.

---

# 33. LOCAL HISTORY

Provide a history drawer.

Example:

```text
History

Today

users-api.json
2:41 PM

config.json
1:12 PM

Yesterday

response.json
6:30 PM
```

History must be stored locally.

Prefer IndexedDB for larger data.

Allow:

```text
Restore
Delete
Clear history
```

Do not require an account.

---

# 34. HISTORY PRIVACY

Make it clear:

```text
Stored locally on this device.
```

Do not send history to the backend.

Do not store sensitive JSON remotely.

---

# 35. COMMAND PALETTE

Add a command palette.

Shortcut:

```text
Cmd/Ctrl + K
```

Commands:

```text
Format JSON
Minify JSON
Validate JSON
Fix JSON
Expand All
Collapse All
Copy JSON
Download JSON
Open File
Toggle Tree
Toggle Table
Show Statistics
Generate TypeScript
Generate Python
Generate Go
Convert to YAML
Toggle Theme
Clear Workspace
```

This should make JSONLens feel like a serious developer application.

---

# 36. KEYBOARD SHORTCUTS

Support:

```text
Ctrl/Cmd + Enter
Format

Ctrl/Cmd + Shift + M
Minify

Ctrl/Cmd + S
Download

Ctrl/Cmd + K
Command palette

Ctrl/Cmd + F
Search

Ctrl/Cmd + Shift + C
Copy formatted JSON

Esc
Close modal / command palette
```

Do not override browser shortcuts unnecessarily.

---

# 37. DRAG & DROP

Support dragging:

* JSON files
* text containing JSON

Drop anywhere over the workspace.

Show a subtle overlay:

```text
Drop JSON file to open
```

Do not use a giant animated overlay.

---

# 38. TOAST SYSTEM

Use subtle toast notifications.

Examples:

```text
✓ JSON formatted
```

```text
✓ Copied to clipboard
```

```text
✓ Download started
```

```text
✓ 3 fixes applied
```

Toasts should disappear automatically.

Do not spam users.

---

# 39. COPY EXPERIENCE

Copy buttons should provide immediate feedback.

Before:

```text
Copy
```

After:

```text
✓ Copied
```

Return automatically to:

```text
Copy
```

Do not show unnecessary modal dialogs.

---

# 40. DOWNLOAD EXPERIENCE

Download should happen immediately.

Do not open another page.

Filename:

```text
formatted.json
```

Allow future filename customization.

---

# 41. SHARE FEATURE

Design the UI architecture for future shareable JSON links.

Do not necessarily implement it in v1.

Future interaction:

```text
Share
```

Options:

```text
Private link
Expires in 1 hour
Expires in 24 hours
Expires in 7 days
```

Important:

Because JSON can contain secrets, sharing must have strong warnings.

Never silently upload private JSON.

---

# 42. THEME

Support:

```text
Dark
Light
System
```

Default:

```text
System
```

But ensure dark mode is excellent.

Do not simply invert colors.

Editor syntax highlighting must be designed separately for each theme.

---

# 43. SETTINGS

Settings drawer:

```text
Editor

Indentation
2 spaces

Word wrap
On / Off

Line numbers
On / Off

Auto validate
On / Off

Format on paste
On / Off

Theme
System / Light / Dark

History
Enable local history
```

Keep settings lightweight.

---

# 44. RESPONSIVE WORKSPACE

Desktop:

```text
Input | Inspector
```

Tablet:

```text
Input
Inspector
```

with tabs:

```text
Input | Formatted | Tree | Stats
```

Mobile:

```text
JSONLens

[Input]
[Formatted]
[Tree]
[Stats]

Format
```

Do not attempt desktop-style split panels on narrow screens.

---

# 45. ACCESSIBILITY

The product must be keyboard usable.

Requirements:

* visible focus states
* semantic buttons
* ARIA labels
* sufficient contrast
* keyboard navigation
* screen-reader-friendly controls
* dialogs trap focus
* escape closes dialogs
* no interaction dependent solely on color

Editor functionality must remain accessible where possible.

---

# 46. ANIMATION

Animations should be subtle.

Use animation for:

* panel transitions
* drawer opening
* tab switching
* toast appearance
* tree expand/collapse

Avoid:

* floating animations
* excessive gradients
* bouncing buttons
* animated backgrounds
* slow page transitions

Developer tools should feel fast.

---

# 47. PERFORMANCE

Performance is a product feature.

Requirements:

* client-side processing
* debounce validation
* Web Workers for expensive parsing when appropriate
* virtualized tree rendering for large structures
* avoid unnecessary Angular/React re-renders
* lazy-load graph/conversion functionality
* don't parse the same JSON repeatedly
* memoize derived statistics
* don't block the main thread

The interface must remain responsive while processing large JSON.

---

# 48. ARCHITECTURE

Build the frontend as a modular tool.

Separate concerns:

```text
jsonlens/
│
├── editor/
│   ├── input-editor
│   ├── output-editor
│   └── editor-toolbar
│
├── parser/
│   ├── json-parser
│   ├── validator
│   ├── formatter
│   ├── minifier
│   └── fixer
│
├── inspector/
│   ├── tree-view
│   ├── table-view
│   ├── statistics
│   └── search
│
├── converters/
│   ├── yaml
│   ├── csv
│   └── xml
│
├── generators/
│   ├── typescript
│   ├── python
│   └── go
│
├── history/
│
├── commands/
│
├── settings/
│
└── shared/
```

Do not build one enormous component.

Every major feature must have isolated responsibility.

---

# 49. STATE MANAGEMENT

Separate:

### Source state

```text
rawJson
```

### Parsed state

```text
parsedJson
```

### Validation state

```text
isValid
error
line
column
```

### View state

```text
activeView
expandedNodes
searchQuery
```

### User preferences

```text
theme
indentation
wordWrap
autoValidate
```

### History

```text
recentDocuments
```

Do not tightly couple editor state with UI state.

---

# 50. IMPORTANT DATA SAFETY RULE

Never send JSON to a backend for:

* formatting
* validation
* parsing
* tree rendering
* statistics
* minification
* conversion
* code generation

These should be local whenever technically possible.

Do not introduce unnecessary API calls.

---

# 51. SEO / PAGE STRUCTURE

The application workspace should remain app-like.

But the page can contain a lightweight SEO section below the tool.

Suggested content:

### JSON Formatter & Validator

Format, validate, minify and inspect JSON directly in your browser.

### Why JSONLens?

* Instant formatting
* Precise validation errors
* Interactive tree inspection
* JSON statistics
* Code generation
* JSON conversion
* Local processing
* No signup required

Do not let SEO content interfere with the workspace.

The tool is the product.

---

# 52. MICROCOPY

Use concise developer-friendly language.

Good:

```text
Valid JSON
```

```text
Invalid JSON
```

```text
Format
```

```text
Minify
```

```text
Fix JSON
```

```text
Expand all
```

```text
Collapse all
```

Bad:

```text
✨ Supercharge your JSON workflow!
```

Avoid marketing language inside the application.

---

# 53. EMPTY STATES

Formatted:

```text
Nothing to inspect yet.

Paste or upload JSON to get started.
```

Tree:

```text
Format valid JSON first to explore its structure.
```

Stats:

```text
Statistics will appear once valid JSON is loaded.
```

Code generation:

```text
Load valid JSON to generate code.
```

---

# 54. ERROR STATES

Never use vague errors.

Bad:

```text
Something went wrong.
```

Good:

```text
Invalid JSON

Line 18 · Column 7

Expected a comma between object properties.
```

If the browser cannot identify the exact cause:

```text
Invalid JSON

The parser could not determine the exact cause.

Check the highlighted region around line 18.
```

Never invent an error explanation.

---

# 55. ADVANCED FEATURES — DESIGN FOR THEM, DON'T FAKE THEM

The architecture should be extensible for:

### Graph

Interactive JSON node visualization.

### JSONPath

Query JSON structures.

### Diff

Compare:

```text
JSON A
vs
JSON B
```

### Schema validation

Support JSON Schema in a future release.

### Share

Generate secure shareable links.

### Map

Potential visualization for geographic JSON.

These should not clutter v1.

---

# 56. MVP FEATURE PRIORITY

Implement these first:

## P0 — Required

* JSON editor
* Format
* Minify
* Validate
* Precise errors
* Auto-format on paste
* Tree view
* Formatted view
* Copy
* Download
* Upload
* Dark/light/system theme
* Indentation settings
* Search
* Expand/collapse
* Privacy indicator
* Statistics
* Local history

## P1 — High-value

* JSON repair
* JSON → TypeScript
* JSON → Python
* JSON → Go
* JSON → YAML
* JSON → CSV
* JSON → XML
* Command palette
* Keyboard shortcuts
* Table view

## P2 — Advanced

* Graph
* JSONPath
* Diff
* JSON Schema
* Share links
* Geo/map visualization

---

# 57. FIRST-LOAD EXPERIENCE

When the user opens JSONLens:

Do NOT immediately show a huge example JSON.

Instead show a clean empty workspace.

Center:

```text
JSONLens

Format. Validate. Inspect.

Paste JSON or drop a .json file

[Try an example]
```

Then show:

```text
🔒 Processed entirely in your browser
```

Once JSON is pasted, the empty state disappears immediately.

---

# 58. EXAMPLE MODE

Provide examples through a small selector:

```text
Try example

API Response
Nested Object
Array Dataset
Configuration
```

When selected, load example JSON locally.

This demonstrates functionality without requiring documentation.

---

# 59. DESKTOP LAYOUT DETAILS

At 1440px:

Top navigation:

```text
56px
```

Workspace toolbar:

```text
48px
```

Status bar:

```text
28–32px
```

Main editor:

```text
remaining viewport height
```

Use:

```text
height: calc(100vh - header - toolbar - statusbar)
```

The editor should occupy almost the entire viewport.

Avoid page scrolling while editing.

Only the internal tool panels should scroll.

---

# 60. PANEL RESIZING

The input and inspector panels should be resizable.

Default:

```text
50 / 50
```

Allow:

```text
40 / 60
60 / 40
70 / 30
```

Drag the divider.

Show a subtle hover state.

Remember the user's panel width locally.

---

# 61. FULLSCREEN MODE

Provide:

```text
Focus Mode
```

This removes:

* Acklet navigation
* SEO content
* unnecessary UI

Leaving:

```text
JSONLens workspace
```

Useful for developers working with large payloads.

Keyboard:

```text
Ctrl/Cmd + Shift + F
```

---

# 62. TOOLTIP SYSTEM

Use tooltips for unfamiliar icons.

Examples:

```text
Copy JSON
Download JSON
Expand all
Collapse all
Open command palette
Toggle focus mode
```

Never rely on icons alone for critical actions.

---

# 63. ICONOGRAPHY

Use one consistent icon library.

Recommended:

```text
Lucide
```

Icons should be:

* small
* precise
* consistent
* unobtrusive

Do not mix multiple icon styles.

---

# 64. BUTTON DESIGN

Primary button:

```text
Format
```

Should clearly stand out.

Secondary:

```text
Minify
Validate
Fix
```

Tertiary:

```text
Copy
Download
```

Danger:

Only use for destructive actions:

```text
Clear
Delete history
```

Never use red buttons for ordinary actions.

---

# 65. MOBILE PRIORITY

On mobile the primary flow is:

```text
Paste
↓
Validate
↓
Format
↓
Copy
```

Everything else becomes secondary.

Use a bottom action bar if necessary:

```text
Format | Validate | Copy | More
```

Do not make mobile users hunt through menus for Format.

---

# 66. PRODUCT PERSONALITY

JSONLens should communicate:

```text
"Built by developers who actually use developer tools."
```

Not:

```text
"Another pretty SaaS landing page."
```

The interface should feel extremely intentional.

Every visible element must justify its existence.

---

# 67. WHAT NOT TO BUILD

Do NOT:

* clone json.site
* copy competitor layouts
* use huge hero sections
* create unnecessary dashboards
* add fake AI features
* require login
* send JSON to the backend
* add ads inside the workspace
* create excessive modals
* make every feature a card
* use giant gradients
* add meaningless animations
* overwhelm first-time users with advanced features

---

# 68. IMPORTANT UX DECISION

Do not expose all features simultaneously.

Primary experience:

```text
Format
Validate
Inspect
```

Secondary:

```text
Minify
Fix
Convert
Generate
```

Advanced:

```text
Graph
JSONPath
Diff
Schema
Share
```

The interface should progressively reveal complexity.

---

# 69. QUALITY BAR

Before considering the implementation complete, test these flows:

### Flow 1

Paste valid minified JSON.

Expected:

```text
Instant validation
Format available
Tree available
Stats available
```

### Flow 2

Paste invalid JSON.

Expected:

```text
Exact error
Line
Column
Explanation
Go to error
Fix if possible
```

### Flow 3

Upload JSON.

Expected:

```text
File loaded
Validated
Formatted
Inspectable
```

### Flow 4

Large nested JSON.

Expected:

```text
No UI freeze
Tree remains usable
Search works
Statistics remain responsive
```

### Flow 5

Copy.

Expected:

```text
Clipboard updated
Subtle success feedback
```

### Flow 6

Switch theme.

Expected:

```text
Entire workspace updates
Editor syntax highlighting remains readable
Preference persists
```

### Flow 7

Refresh page.

Expected:

```text
User preferences remain
Local history remains
Current document behavior follows chosen history policy
```

---

# 70. FINAL VISUAL GOAL

When the finished product is opened, the first impression should be:

> "This looks like a serious developer application."

Not:

> "This is another online JSON formatter."

The strongest visual hierarchy should be:

```text
JSONLens
    ↓
Editor
    ↓
Format / Validate
    ↓
Inspector
    ↓
Developer utilities
```

The interface should feel fast, private, precise, and deeply usable.

---

# 71. IMPLEMENTATION INSTRUCTION TO LOVABLE

Build the complete working interface, not a static mockup.

All visible controls should work.

Do not create buttons that do nothing.

Do not create placeholder tabs pretending features exist.

If a feature is not implemented, hide it rather than displaying a fake interaction.

Use realistic sample JSON.

Implement responsive behavior.

Implement keyboard interactions.

Implement loading, empty, valid, invalid, and large-data states.

Make the workspace polished before adding secondary features.

Prioritize correctness and UX over the number of features.

---

# 72. FINAL ACCEPTANCE CRITERIA

JSONLens is successful when a developer can:

1. Open the tool
2. Paste JSON
3. Immediately understand whether it is valid
4. Format it
5. Inspect it as a tree
6. Search it
7. Understand its size/depth/structure
8. Copy or download it
9. Switch between views
10. Fix common mistakes
11. Generate useful code
12. Convert it into another format

without leaving the workspace.

The final product must feel like a **developer workspace**, not a collection of unrelated JSON utilities.

Build JSONLens as a first-class Acklet tool with a strong independent identity while remaining visually compatible with the broader Acklet ecosystem.
