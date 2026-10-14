# Online Clipboard Tool

## Overview
The **Online Clipboard** tool allows users to share text, links, and files across devices in real time with end-to-end optional encryption and responsive layout integration.

## Key Features & UI Structure
- **Top Strip**:
  - Displays the active **Clipboard ID** (short alphanumeric code).
  - Inline editing with uniqueness verification: users can click the edit pencil icon to set a custom unique room name (e.g. `my-test-room`), which validates and updates the room and session seamlessly.
  - Active session persistence in device storage (`localStorage['acklet_clipboard_active_code']`) so closing and reopening the browser restores the active session without loss (similar to Google Drive sessions).
  - Seamless path variable routing (`/${code}`) removing the `#` hash fragment.
  - Live status indicator (real-time sync indicator).
  - Quick action links: "Copy link", "New clipboard", "Have a code? [Open]".
- **Tabs**:
  - **Modern Segmented Pill Navigation**: Premium floating segmented pill track housing **Text & Links** and **Files** tabs with smooth state transitions, balanced 16px Lucide icons, dynamic file count badges, and dedicated dual-theme contrast styling (light card surface elevation and dark glass glow).
  - **Text & Links**: Unified shared editor with copy, refresh, save, and clear actions, character counts, and URL detection.
  - **Files**: Integrated file library supporting drag-and-drop, filter categories, search, grid/list view toggling, and multi-file downloads.
- **Surface & Design System**:
  - Clean borderless main content card and inputs adhering to Acklet UI Foundation with no harsh green outlines.
  - Textarea with ambient soft focus ring and borderless resting state.
  - Complete Lucide icon integration for all toolbars, view toggles, filters, and file categories.
  - High-contrast Add button with leading `+` icon and crisp visibility across both Light and Dark themes.
  - Horizontal slide swap animations (`slide-from-left` / `slide-from-right`) on tab switching.
  - Viewport-locked layout (`100dvh` / `100vh`) keeping the entire workspace within view with internal scrolling containers.
  - Full dual-theme high contrast support (Light & Dark).
