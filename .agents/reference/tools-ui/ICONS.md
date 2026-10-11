# Tools Icon Manifest & Inventory Table

This document maintains the complete inventory of all semantic icons across Acklet Tools (`apps/tools-hub`, `apps/tool-online-clipboard`, and `packages/tool-shell`).

## Architecture & Priority Hierarchy
1. **Lordicon** (Outline style, stroke: 45) for slots $\ge 20\text{px}$ (dynamic lazy load with `<lord-icon>` web component). Empty states use large Motif/Outline style ($24\text{px}$ – $56\text{px}$).
2. **ng-animated-icons** (Lucide-based animated SVG) for slots $\ge 20\text{px}$ where Lordicon JSON is not yet installed.
3. **Lucide Fallback** (Instant static vector SVG with small CSS transform micro-motion on hover for pointer devices):
   - `send`: translate (2px, -2px) up-right
   - `receive`, `download`: translate 2px down
   - `history`, `clock`: rotate -20deg
   - `settings`, `settings-2`: rotate 45deg
   - `copy`, `file`, `file-text`, `file-code`, `clipboard`: scale 1.06
   - `star`: scale 1.12 + rotate 8deg
   - `search`: scale 1.06
   - `arrow-up-right`, `arrow-right`: translate 2px right
   - `sun`, `moon`: rotate 15deg
   - Tiny control arrows, chevrons, close, and dots stay static Lucide.

---

## Complete Icon Inventory & Match Table

| Semantic Key | Page(s) Where Used | Size | Current Source | Best Lordicon Match (Outline / Free) | ng-animated-icons Match | Decision | File Name / Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `copy` | Tool Page (Share Code, Snippets, Header Share) | 20px, 24px | lordicon | Document Copy (`56-document-outline`) | `CopyIcon` | lordicon | `packages/tool-shell/src/assets/icons/lordicon/copy.json` |
| `clipboard` | Hub (Tool Tile), Tool Page (Header, Sidebar) | 24px, 28px, 42px | animated | Clipboard task check (search: "clipboard check document") | `ClipboardIcon` | animated | to download (`clipboard.json`) |
| `upload` | Tool Page (Segmented Tab, Image/File Drop Actions) | 20px | animated | Upload arrow to tray (search: "upload arrow tray") | `UploadIcon` | animated | to download (`upload.json`) |
| `download` | Tool Page (Segmented Tab, File/Image Card Actions) | 20px | animated | Download arrow to tray (search: "download arrow tray") | `DownloadIcon` | animated | to download (`download.json`) |
| `upload-cloud` | Tool Page (Trust Chip, Dropzone Tiles) | 20px, 24px | animated | Cloud upload arrow (search: "cloud upload") | `HardDriveUploadIcon` | animated | to download (`upload-cloud.json`) |
| `history` | Hub (Recent Tab Empty State), Tool Page (Header History, Drawer) | 20px, 24px | animated | Clock history rewind (search: "clock history time") | `HistoryIcon` | animated | to download (`history.json`) |
| `settings` | Tool Page (Shell Drawer Settings) | 20px | animated | Settings cog gear (search: "gear cog settings") | `SettingsIcon` | animated | to download (`settings.json`) |
| `settings-2` | Tool Page (Top Action Settings Button) | 20px | animated | Sliders preferences (search: "sliders controls adjustments") | `SettingsIcon` | animated | to download (`settings-2.json`) |
| `search` | Hub (Search Box, Empty State), Tool Page (Topbar, Sidebar, Palette) | 15px, 16px, 24px | animated | Magnifying glass (search: "search magnifying glass") | `SearchIcon` | animated | to download (`search.json`) |
| `star` | Hub (Tool Favorite, Empty State), Tool Page (Header Save Action) | 16px, 24px | animated | Star bookmark favorite (search: "star bookmark favorite") | `StarIcon` | animated | to download (`star.json`) |
| `sun` | Hub & Tool Page (Theme Toggle) | 16px, 20px | animated | Sun daylight brightness (search: "sun light mode") | `SunIcon` | animated | to download (`sun.json`) |
| `moon` | Hub & Tool Page (Theme Toggle) | 16px, 20px | animated | Moon night crescent (search: "moon dark night") | `CloudMoonIcon` | animated | to download (`moon.json`) |
| `trash-2` | Tool Page (Snippet / File / Image Card Delete) | 14px, 20px | animated | Trash can bin delete (search: "trash bin delete") | `Trash2Icon` | animated | to download (`trash-2.json`) |
| `file-text` | Tool Page (Text Tab, Empty State) | 20px, 24px | animated | File document note (search: "document text file") | `FileTextIcon` | animated | to download (`file-text.json`) |
| `image` | Tool Page (Images Tab, Empty State) | 20px, 24px | lucide | Picture frame landscape (search: "image photo picture") | None (Lucide fallback) | lucide | to download (`image.json`) |
| `image-plus` | Tool Page (Images Drop Zone Tile) | 24px | lucide | Image photo add (search: "image photo add plus") | None (Lucide fallback) | lucide | to download (`image-plus.json`) |
| `folder` | Tool Page (Files Tab) | 20px | lucide | Directory folder (search: "folder directory file") | None (Lucide fallback) | lucide | to download (`folder.json`) |
| `folder-open` | Tool Page (Files Dropzone Empty State) | 24px | lucide | Folder open browse (search: "folder open browse") | None (Lucide fallback) | lucide | to download (`folder-open.json`) |
| `file` | Tool Page (File Row Item Tile) | 20px | lucide | File document generic (search: "file page document") | None (Lucide fallback) | lucide | to download (`file.json`) |
| `file-code` | Tool Page (Snippet Code Item Tile) | 16px | animated | Code script document (search: "code script document") | `FileCheckIcon` | animated | to download (`file-code.json`) |
| `lock` | Tool Page (PIN Entry Notice Banner) | 16px, 20px | lucide | Padlock secure privacy (search: "lock padlock security") | None (Lucide fallback) | lucide | to download (`lock.json`) |
| `shield-check` | Tool Page (Trust Chip Badge) | 16px, 20px | animated | Shield protection verified (search: "shield check mark security") | `ShieldCheckIcon` | animated | to download (`shield-check.json`) |
| `qr-code` | Tool Page (Pill Button, Modal Header) | 20px | lucide | QR code matrix scan (search: "qr code scan matrix") | None (Lucide fallback) | lucide | to download (`qr-code.json`) |
| `flag` | Tool Page (Report Button, Report Modal Header) | 20px | lucide | Flag alert report (search: "flag report banner") | None (Lucide fallback) | lucide | to download (`flag.json`) |
| `archive` | Tool Page (ZIP All Top Action Button) | 20px | animated | Archive box zip (search: "archive box package") | `ArchiveIcon` | animated | to download (`archive.json`) |
| `clock` | Tool Page (Retention Trust Chip) | 16px | animated | Clock timer duration (search: "clock timer watch") | `HistoryIcon` | animated | to download (`clock.json`) |
| `zap` | Tool Page (Acklet Brand Mark, Mobile Header) | 18px, 24px | lucide | Lightning flash energy (search: "lightning bolt zap energy") | None (Lucide fallback) | lucide | to download (`zap.json`) |
| `braces` | Hub (JSON Formatter Tool Tile) | 24px, 42px | lucide | Code curly braces (search: "code curly brackets braces") | None (Lucide fallback) | lucide | to download (`braces.json`) |
| `key-round` | Hub (JWT Inspector Tool Tile) | 24px, 42px | animated | Key round access token (search: "key unlock access token") | `KeyIcon` | animated | to download (`key-round.json`) |
| `fingerprint` | Hub (UUID Generator Tool Tile) | 24px, 42px | lucide | Fingerprint biometric id (search: "fingerprint biometric touch id") | None (Lucide fallback) | lucide | to download (`fingerprint.json`) |
| `binary` | Hub (Base64 Encoder Tool Tile) | 24px, 42px | lucide | Binary code digital 01 (search: "binary data code digits") | None (Lucide fallback) | lucide | to download (`binary.json`) |
| `arrow-up-right` | Hub (Row Open Action), Tool Page (Related Tools Item) | 14px, 16px | lucide | Tiny diagonal open arrow (static UI navigation) | None (Lucide fallback) | lucide | `lucide` (static CSS motion) |
| `arrow-right` | Tool Page (Topbar Primary CTA Button) | 13px, 14px | animated | Arrow right forward (search: "arrow right forward") | `ArrowRightIcon` | animated | `lucide` / `animated` |
| `plus` | Tool Page (Add Snippet, FAQ Expand) | 14px, 16px | animated | Plus add symbol (search: "plus add symbol") | `PlusIcon` | animated | `animated` |
| `minus` | Tool Page (FAQ Collapse) | 15px | animated | Minus remove symbol (search: "minus line") | `MinusIcon` | animated | `animated` |
| `chevron-right` | Tool Page (Sidebar Category Expand Accordion) | 14px | animated | Chevron right expand (search: "chevron arrow right") | `ChevronRightIcon` | animated | `animated` |
| `chevron-down` | Tool Page (FAQ Show More Accordion) | 14px | animated | Chevron down fold (search: "chevron arrow down") | `ChevronDownIcon` | animated | `animated` |
| `chevron-up` | Tool Page (FAQ Show Less Accordion) | 14px | animated | Chevron up fold (search: "chevron arrow up") | `ChevronUpIcon` | animated | `animated` |
| `panel-left-open` | Tool Page (Sidebar Rail Expand Button) | 16px | animated | Panel sidebar open (search: "sidebar panel open") | `PanelLeftOpenIcon` | animated | `animated` |
| `panel-left-close`| Tool Page (Sidebar Footer Collapse Button) | 14px | animated | Panel sidebar close (search: "sidebar panel close") | `PanelLeftCloseIcon` | animated | `animated` |
| `x` | Hub (Clear Search), Tool Page (Modal Close, Drawer Close) | 14px, 16px, 18px | animated | Close cancel cross (search: "close cancel cross x") | `XIcon` | animated | `animated` |
| `check` | Tool Page (Copied Pop, Features List) | 12px, 14px, 16px | animated | Check mark tick (search: "check mark tick success") | `CheckIcon` | animated | `animated` |
| `check-circle` | Tool Page (Trust Chip, Report Success Modal) | 16px, 32px | animated | Circle check badge (search: "check mark circle verified") | `CircleCheckIcon` | animated | `animated` |
| `link` | Tool Page (Snippet Link Type, Copy Direct Link) | 16px, 20px | lucide | Link chain hyperlink (search: "link chain url") | None (Lucide fallback) | lucide | to download (`link.json`) |
| `circle-alert` | Tool Page (Receive Error Notice Alert) | 16px | animated | Circle alert warning (search: "warning alert circle notice") | `CircleAlertIcon` | animated | `animated` |
| `grid` | Tool Page (Sidebar All Tools Hub Link) | 14px, 16px | lucide | Dashboard grid apps (search: "apps grid dashboard menu") | None (Lucide fallback) | lucide | `lucide` (static) |
| `help-circle` | Tool Page (Sidebar Pinned Support Link) | 14px, 16px | lucide | Question mark help circle (search: "help circle question info") | None (Lucide fallback) | lucide | `lucide` (static) |
| `info` | Tool Page (Header About Trigger Button) | 16px | lucide | Information circle (search: "info circle details") | None (Lucide fallback) | lucide | `lucide` (static) |
| `menu` | Tool Page (Mobile Topbar Menu Toggle) | 18px | lucide | Hamburger menu bars (search: "menu hamburger navigation") | None (Lucide fallback) | lucide | `lucide` (static) |
| `eye` | Tool Page (Private Mode Active, View Count Tick) | 12px, 14px | lucide | Eye vision open (search: "eye vision look") | None (Lucide fallback) | lucide | `lucide` (static) |
| `eye-off` | Tool Page (Private Mode History Toggle Button) | 14px | animated | Eye slash invisible (search: "eye slash hidden invisible") | `EyeOffIcon` | animated | `animated` |
| `maximize-2` | Tool Page (Lightbox Preview Expand Icon) | 24px | lucide | Fullscreen maximize expand (search: "maximize arrows expand") | None (Lucide fallback) | lucide | `lucide` (static) |
