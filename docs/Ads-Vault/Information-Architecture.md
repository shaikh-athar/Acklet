# Acklet Information Architecture

> **Related Documents**:
> - [Design System](Design-System.md)
> - [Motion System](Motion-System.md)
> - [Product Experience System](Product-Experience-System.md)

---

## 1. Page-by-Page Specifications

### A. Home Page (The Entry Hub)
*   **Goal**: Drive instant discovery and establish credibility. The user should understand Acklet is a fast, offline-first workspace.
*   **User Problem**: "I need to format JSON, decode JWT, or hash a string right now, and I want to verify that my data won't leak."
*   **Primary CTA**: "Browse Solutions" (Links to `/tools`)
*   **Secondary CTA**: "Explore Categories" (Links to `/categories`)
*   **Section Hierarchy**:
    1.  Hero Section & Instant Omni-Search
    2.  Trust Indicators (Factual security & performance signals)
    3.  Featured Solutions (Top 3 daily tools)
    4.  Categories Grid
    5.  Product Philosophy & Non-Marketing Guarantees
    6.  Trending Tools
    7.  Footer Action
*   **Content Priority**: Omni-search must dominate the view above the fold. Search is the main entry vector.
*   **Expected Interactions**:
    *   Keyboard shortcut `/` highlights search.
    *   Dynamic dropdown displays results instantly below search bar.
    *   Hovering over categories shifts ambient backlights.
*   **Animation Opportunities**:
    *   GSAP scroll reveal for trust grid and cards.
    *   Ambient background mesh drift.
    *   Smooth expansion of search dropdown preview.

---

### B. Solutions Page (The Search Directory)
*   **Goal**: Allow rapid search and categorization of all tools in our catalog.
*   **User Problem**: "I want to explore what Developer or Security tools are available, or search by a specific tag."
*   **Primary CTA**: Open specific Tool detail.
*   **Secondary CTA**: Filter by Category.
*   **Section Hierarchy**:
    1.  Header with total count and filter tag selection.
    2.  Horizontal Category filtering bar.
    3.  Tools Grid.
    4.  Empty Search State helper.
*   **Content Priority**: The tool search input is sticky at the top of the grid. Quick-filters (New, Popular, Trending) are highly visible.
*   **Expected Interactions**:
    *   Live list updating without screen flicker or jumpy layout shifting.
    *   Dynamic tag highlighting when selected.
*   **Animation Opportunities**:
    *   Grid re-layout animation using GSAP Flip.
    *   Fade-in of card collections.

---

### C. Tool Detail Page (The Playground Workspace)
*   **Goal**: Provide a clean, high-performance sandbox for the selected tool.
*   **User Problem**: "I want to paste code or JSON, configure a format, run it immediately, and copy results safely."
*   **Primary CTA**: "Copy Output"
*   **Secondary CTA**: "Reset/Clear Input"
*   **Section Hierarchy**:
    1.  Breadcrumb Navigation (`Solutions / Category / Tool Name`)
    2.  Core Workspace Layout:
        *   Left Panel: Inputs and configuration toggles.
        *   Right Panel: Output panel with highlighting, copy tools, and size statistics.
    3.  How It Works & Local Processing Explanation
    4.  Structured FAQs (Security focus)
    5.  Related Solutions suggestions.
*   **Content Priority**: Playground dominates. Split pane is 50-50 width on desktop, stacking vertically on mobile.
*   **Expected Interactions**:
    *   Dynamic statistics updates (character count, parsing speed, output size).
    *   Interactive copy trigger which pops a success state toast.
*   **Animation Opportunities**:
    *   Output section border shim on successful processing.
    *   Toast entrance and exit slide physics.
    *   Slide-in FAQs.

---

### D. Categories Page (The Exploration Portal)
*   **Goal**: Group solutions logically by intent.
*   **User Problem**: "I don't know the exact name of the tool, but I have a document problem or security problem."
*   **Primary CTA**: Click Category.
*   **Secondary CTA**: Search Categories.
*   **Section Hierarchy**:
    1.  Page header.
    2.  Complete Categories list, showing matching tool count.
    3.  Popular tool shortcuts under each category.
*   **Content Priority**: Category cards should clearly show their Lucide Icon and tool count to guide selection.
*   **Expected Interactions**:
    *   Mouse spotlight halo on category cards.
*   **Animation Opportunities**:
    *   Soft hover bounce on Lucide icons.
    *   Staggered grid reveal.

---

### E. About Page (The Philosophy Narrative)
*   **Goal**: Explain the craftsmanship, lack of trackers, and engineering behind Acklet.
*   **User Problem**: "Who runs this, why is it free, and can I trust it?"
*   **Primary CTA**: "Browse Solutions"
*   **Secondary CTA**: "Contact"
*   **Section Hierarchy**:
    1.  Narrative Header (Craftsmanship & privacy mission).
    2.  Core Pillars (No Ads, No Subscriptions, Local Execution).
    3.  Tech Stack & Performance stats.
    4.  Author / Team info.
*   **Content Priority**: Manifesto text is structured with premium serif italic headers using `Sorts Mill Goudy`.
*   **Expected Interactions**:
    *   Smooth scroll tracking down the timeline.
*   **Animation Opportunities**:
    *   Gsap scroll storytelling timeline reveals.

---

### F. Contact Page (Feedback Panel)
*   **Goal**: Gather feedback, tool requests, and bug reports.
*   **User Problem**: "I found a bug in the JWT decoder or want a new tool added."
*   **Primary CTA**: "Submit Message" (Dynamic button with loading state).
*   **Secondary CTA**: Return Home.
*   **Section Hierarchy**:
    1.  Header and form introduction.
    2.  Simple Feedback form (Name, Email, Message Type, Message body).
*   **Content Priority**: Input fields are clean with distinct focus rings.
*   **Expected Interactions**:
    *   Real-time form validation showing soft checkmark icons or error states.
*   **Animation Opportunities**:
    *   Button state changes (Transition to loading wheel and then checkmark).

---

### G. Community Portal (Discussions, Showcase, Features, Help)
*   **Goal**: Drive user engagement and collaborative problem-solving.
*   **User Problem**: "I want to see how others are using Acklet, request new integrations, or ask for help."
*   **Primary CTA**: "Start Discussion" / "Submit Showcase"
*   **Secondary CTA**: Upvote Feature requests.
*   **Section Hierarchy**:
    1.  Sub-navigation (Discussions, Showcase, Feature Requests, Help & Support).
    2.  Featured Showcase/Highlight Reel.
    3.  Thread list with filtering pills (Trending, Unanswered, Solved).
*   **Expected Interactions**: Staggered cards load, hover pulls (magnetic arrows), dynamic voting counters incrementing via GSAP.
*   **Animation Opportunities**: Smooth Flip grid updates when switching categories.

---

### H. Blog (Articles & Insights)
*   **Goal**: Educate users on local processing, encryption, and client-side best practices.
*   **User Problem**: "How does local base64 decoding work under the hood? What are the risks of online decoders?"
*   **Primary CTA**: Read Article.
*   **Secondary CTA**: "Browse related tools".
*   **Section Hierarchy**:
    1.  Featured Article header (large typography, subtle ambient spotlight).
    2.  Articles Grid (categorized by Security, Productivity, Developer).
    3.  Newsletter Sign-up (premium text box).
*   **Expected Interactions**: Spotlight glows on hover cards, magnetic newsletter CTA.
*   **Animation Opportunities**: Page reveal transitions, slide-up timeline inside article views.

---

### I. Authentication (Login, Signup, OTP, Welcome)
*   **Goal**: Secure, zero-friction account creation and workspace access.
*   **User Problem**: "I want to synchronize my workspace history across my laptop and phone."
*   **Primary CTA**: "Sign In" / "Create Account"
*   **Secondary CTA**: Forgot Password link.
*   **Section Hierarchy**:
    1.  Clean, card-centric auth layouts.
    2.  Password-less email verification / OTP flow.
    3.  "Welcome / Account Created" onboarding wizard.
*   **Expected Interactions**: Inputs validation indicators, button transition states.
*   **Animation Opportunities**: Springy card shake on validation failure, scale transitions on wizard steps.

---

### J. Workspace Dashboard (Authenticated Core)
*   **Goal**: Provide a highly personalized cockpit for daily tasks.
*   **User Problem**: "I format JSON and encode Base64 every hour; I want them pinned and ready."
*   **Primary CTA**: Launch Pinned Tool.
*   **Secondary CTA**: Create custom tool Collection.
*   **Section Hierarchy**:
    1.  Layout Shell: Sidebar navigation + quick actions omnibar.
    2.  Pinned / Favorite Tools grid.
    3.  Recent History checklist (one-click rerun).
    4.  Notifications & Alert stack.
*   **Expected Interactions**: Drag-and-drop tool cards to reorder, sidebar collapse/expand.
*   **Animation Opportunities**: GSAP Flip grid layout adjustments, sidebar slide transitions.

