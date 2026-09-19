# UI/UX Brief

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Design Vision

**ROA feels like a polished, native Windows application** — not an Electron app, not a web view, not an AI chat wrapper. The pet is the hero; the dashboard is a well-crafted control panel.

### Core Principles

| Principle | Application |
|-----------|-------------|
| **Delight First** | Every interaction with the pet should spark micro-joy |
| **Invisible Tech** | Electron, IPC, SQLite — user never sees them |
| **Respectful Presence** | Pet never interrupts flow; notifications are gentle |
| **Craftsmanship** | Pixel-perfect, 60fps, thoughtful motion, accessible |
| **Local-First Honesty** | No "cloud sync" promises; works beautifully offline |

---

## 2. Visual Direction

### 2.1 Aesthetic Keywords

- **Warm minimalism** — not sterile, not cluttered
- **Soft geometry** — rounded corners, organic shapes
- **Purposeful color** — meaning-driven, not decorative
- **Depth without weight** — subtle shadows, layering
- **Personality in motion** — easing, stagger, follow-through

### 2.2 Color System

#### Pet Window (Character-Driven)
- Character defines its own palette via manifest
- UI chrome (speech bubbles, menus) adapts to character accent
- High contrast for accessibility

#### Dashboard (Application Chrome)
```
Light Mode                          Dark Mode
────────────────────────────────────────────────────────
Background:      #FAFAFA              #1A1A2E
Surface:         #FFFFFF              #252542
Surface Elevated:#FFFFFF              #2D2D4E
Border:          #E5E5E5              #3D3D6B
Primary:         #6366F1              #818CF8
Primary Hover:   #4F46E5              #6366F1
Accent:          #F59E0B              #FBBF24
Success:         #10B981              #34D399
Warning:         #F59E0B              #FBBF24
Error:           #EF4444              #F87171
Text Primary:    #18181B              #F4F4F5
Text Secondary:  #71717A              #A1A1AA
Text Muted:      #A1A1AA              #71717A
```

#### Semantic Color Usage
- **Primary**: Interactive elements (buttons, links, focus rings)
- **Accent**: Highlights, active states, pet speech bubble tail
- **Success**: Completed timers, enabled toggles
- **Warning**: Snoozed reminders, pending actions
- **Error**: Failed sync, validation errors

### 2.3 Typography

| Role | Font | Size/Weight | Usage |
|------|------|-------------|-------|
| Display | Inter Variable | 32px/600 | Dashboard hero |
| Heading 1 | Inter Variable | 24px/600 | Page titles |
| Heading 2 | Inter Variable | 20px/600 | Section headers |
| Heading 3 | Inter Variable | 16px/600 | Card titles |
| Body Large | Inter Variable | 16px/400 | Primary content |
| Body | Inter Variable | 14px/400 | Default text |
| Body Small | Inter Variable | 12px/400 | Captions, metadata |
| Mono | JetBrains Mono | 13px/400 | Code, timestamps, IDs |

**Line height**: 1.5 (body), 1.2 (headings)
**Letter spacing**: -0.02em (display), 0 (body), +0.02em (mono)

### 2.4 Spacing Scale (4px base)

```
0   — 0px      (none)
1   — 4px      (tight)
2   — 8px      (compact)
3   — 12px     (cozy)
4   — 16px     (base)
5   — 20px     (comfortable)
6   — 24px     (generous)
8   — 32px     (section)
10  — 40px     (major)
12  — 48px     (hero)
16  — 64px     (page)
```

### 2.5 Border Radius

```
none     — 0px
sm       — 4px
base     — 8px
md       — 12px
lg       — 16px
xl       — 24px
full     — 9999px
```

---

## 3. Motion & Animation

### 3.1 Motion Principles (Emil Kowalski / Transitions.dev inspired)

1. **Ease out by default** — Things enter fast, settle gently
2. **Stagger children** — Lists, grids cascade in
3. **Respect reduced motion** — `prefers-reduced-motion` disables all non-essential animation
4. **No animation for animation's sake** — Every motion communicates state change
5. **Spring for organic, cubic-bezier for UI** — Pet: springs; Dashboard: precise curves

### 3.2 Timing Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `instant` | 0ms | Immediate feedback (hover, focus) |
| `fast` | 100ms | Tooltips, small transitions |
| `base` | 200ms | Standard UI transitions |
| `slow` | 300ms | Panel slides, modals |
| `slow+` | 500ms | Page transitions, complex enter/exit |

### 3.3 Easing Curves

```css
/* UI Transitions — precise, predictable */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Pet Animations — organic, lively */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-elastic: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### 3.4 Pet Animation Specifics

| Animation | Duration | Easing | Notes |
|-----------|----------|--------|-------|
| Idle breathe | 3-4s loop | ease-in-out | Subtle scale/translate |
| Walk cycle | 0.5s/loop | linear | Frame-based sprite |
| State transition | 300ms | ease-spring | Idle→walk, walk→idle |
| Speech bubble appear | 200ms | ease-out | Scale + fade |
| Speech bubble dismiss | 150ms | ease-in | Scale + fade |
| Reaction (pet/click) | 400ms | ease-bounce | Squash/stretch |
| Mood shift | 600ms | ease-spring | Color/animation crossfade |

---

## 4. Pet Window UX

### 4.1 Window Behavior

| Behavior | Specification |
|----------|---------------|
| Default position | Bottom-right, 24px from edges |
| Draggable | Click & drag anywhere on pet (non-transparent pixels) |
| Click-through mode | Optional: `WS_EX_TRANSPARENT` when not hovered |
| Always on top | Configurable (default: true) |
| Multi-monitor | Remembers monitor; snaps to nearest edge on display change |
| DPI scaling | Renders at native DPI; assets @2x/@3x |

### 4.2 Interaction Model

```
┌─────────────────────────────────────────────────────────────┐
│                    Pet Interaction Zones                     │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │                  [Pet Sprite]                       │   │
│   │                                                     │   │
│   │   ┌─────────────────────────────────────────┐       │   │
│   │   │  Speech Bubble (auto-dismiss 8-12s)     │       │   │
│   │   │  "Time for a break!" ✕                  │       │   │
│   │   └─────────────────────────────────────────┘       │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Hover:     Subtle glow, pause idle animation              │
│   Click:     Reaction animation + contextual menu           │
│   Right-click: Full context menu                            │
│   Drag:      Reposition (snap to edges on release)          │
│   Double-click: Open Dashboard                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Context Menu (Right-Click Pet)

```
┌────────────────────────────┐
│ 🐾 Roa Cat                 │
├────────────────────────────┤
│ 💬  Say something          │
│ 🚶  Walk here              │
│ 😴  Sleep                  │
├────────────────────────────┤
│ ⏰  Reminders  ▶           │
│ ⏱   Timers      ▶         │
├────────────────────────────┤
│ 🏠  Open Dashboard         │
│ ⚙   Settings               │
├────────────────────────────┤
│ 👁   Hide Pet              │
│ 🚪  Quit ROA               │
└────────────────────────────┘
```

### 4.4 Mood System (Visual)

| Mood | Visual Indicators | Triggers |
|------|-------------------|----------|
| Neutral | Default idle animation | Baseline |
| Happy | Brighter colors, bounce, tail wag | Timer completed, reminder dismissed |
| Sleepy | Half-closed eyes, slower blink, yawn | Late night, long idle |
| Sad | Drooped ears, slower movement, muted colors | Missed reminder, timer cancelled |
| Excited | Faster movement, sparkle particles | New reminder created, streak milestone |

---

## 5. Dashboard UX

### 5.1 Information Architecture

```
Dashboard (900×700 default, resizable, min 700×500)
│
├── Sidebar (240px, collapsible to 64px)
│   ├── App Logo + Version
│   ├── Navigation
│   │   ├── Home (Dashboard overview)
│   │   ├── Pet (Character, behavior, mood)
│   │   ├── Reminders (List, create, history)
│   │   ├── Timers (Active, presets, Pomodoro)
│   │   ├── AI Chat (if configured)
│   │   └── Settings
│   └── User Profile / Sync Status (future)
│
└── Content Area (flex-1)
    ├── Top Bar
    │   ├── Page Title
    │   ├── Breadcrumbs (if nested)
    │   └── Primary Action (e.g., "New Reminder")
    └── Page Content
```

### 5.2 Key Pages

#### Home (Landing)
```
┌─────────────────────────────────────────────────────────────┐
│  Good evening, Alex                    [Settings] [Minimize]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Next Reminder    │  │ Active Timer     │  │ Pet Status│ │
│  │                  │  │                  │  │           │ │
│  │ 💧 Drink water   │  │ 🍅 Focus         │  │ 🐾 Roa Cat│ │
│  │ in 12 minutes    │  │ 18:42 remaining  │  │ Happy     │ │
│  │ [Snooze] [Done]  │  │ [Pause] [Stop]   │  │ [Pet Tab] │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Today's Summary                                       │  │
│  │  ✅ 3 reminders completed   ⏱ 2h 15m focus time      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Quick Actions                                         │  │
│  │  [+ Reminder]  [🍅 Pomodoro]  [⏱ Custom Timer]       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Reminders Page
```
┌─────────────────────────────────────────────────────────────┐
│  Rem                                    [+ New Reminder]    │
├─────────────────────────────────────────────────────────────┤
│  [Search...]  [Filter: All ▼]  [Sort: Next Run ▼]          │
├─────────────────────────────────────────────────────────────┤
│  ☐ 💧 Drink water          Every 30 min    Next: 14:30  🔔 │
│  ☐ 💊 Take medication      Daily 09:00     Next: Tomorrow  🔔 │
│  ☐ 📞 Call mom             Weekly Mon 18:00 Next: Monday   🔕 │
│  ☐ 📅 Team meeting         Once  Jan 20    10:00          🔔 │
├─────────────────────────────────────────────────────────────┤
│  Showing 4 of 12 reminders        [Load more]              │
└─────────────────────────────────────────────────────────────┘
```

**Reminder Row States**: Enabled (☐), Disabled (☑ muted), Snoozed (🌙), Overdue (!!)

#### Create/Edit Reminder Modal
```
┌─────────────────────────────────────────────────────────────┐
│  New Reminder                                    [×]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title *                                                    │
│  [ Drink water                                  ]           │
│                                                             │
│  Description                                                │
│  [ Stay hydrated!                               ]           │
│                                                             │
│  Schedule Type  [Interval ▼]                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Every: [30] [Minutes ▼]                             │   │
│  │ Starts: [Today ▼] at [09:00]                        │   │
│  │ Timezone: [System ▼]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Notification                                               │
│  ☑ Show in pet window    ☑ Windows notification   ☑ Sound │
│                                                             │
│  [Cancel]                              [Create Reminder]   │
└─────────────────────────────────────────────────────────────┘
```

#### Timers Page
```
┌─────────────────────────────────────────────────────────────┐
│  Timers                                   [+ New Timer]     │
├─────────────────────────────────────────────────────────────┤
│  Presets:  [🍅 25m]  [☕ 5m]  [🍽 60m]  [💤 20m]            │
├─────────────────────────────────────────────────────────────┤
│  Active Timers                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🍅 Pomodoro #2/4          ████████░░  12:34          │  │
│  │ [Pause] [Skip] [Stop]                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Custom Timer                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Name: [Focus Session          ]  Duration: [25:00]   │  │
│  │ [Start]                                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  History                                                    │
│  ✅ Focus Session        25m    14:22  Today               │
│  ✅ Short Break          5m     14:47  Today               │
│  ✅ Focus Session        25m    14:52  Today               │
└─────────────────────────────────────────────────────────────┘
```

#### AI Chat Page (Conditional)
```
┌─────────────────────────────────────────────────────────────┐
│  AI Assistant                              [Provider ▼]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🤖  Hi! I can help with reminders, timers, and more. │  │
│  │     Try: "Remind me to stretch every hour"           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 👤  Remind me to backup my project at 6pm            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🤖  Done! I've set a reminder for "Backup project"   │  │
│  │     at 6:00 PM today.                                │  │
│  │                                                      │  │
│  │     [View Reminder]  [Snooze 10m]  [Cancel]          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [Type a message...]                    [Send]        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Settings Page
```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                   │
├─────────────────────────────────────────────────────────────┤
│  Sidebar Sections:  General  Pet  Reminders  Timers  AI    │
│                          Advanced  About                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ General                                               │  │
│  │                                                      │  │
│  │ Launch at login        [Toggle]                      │  │
│  │ Language               [English ▼]                   │  │
│  │ Theme                  [System ▼]                    │  │
│  │                                                      │  │
│  │ Data folder: C:\Users\Alex\AppData\Roam\ROA          │  │
│  │ [Open Folder]                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. System Tray UX

### 6.1 Tray Icon States

| State | Icon | Tooltip |
|-------|------|---------|
| Idle | Character silhouette | "ROA — Roa Cat (Happy)" |
| Reminder due | + Bell badge | "Reminder: Drink water" |
| Timer running | + Circular progress | "Focus: 12:34 remaining" |
| AI thinking | + Sparkle | "AI processing..." |
| Error | + Exclamation | "Check dashboard for issues" |

### 6.2 Tray Context Menu

```
┌────────────────────────────┐
│  ROA — Roa Cat 🐾          │
├────────────────────────────┤
│  🏠  Open Dashboard        │
├────────────────────────────┤
│  ⏰  Reminders             │
│     Drink water - 12 min   │
│     Take medication - 2h   │
│     [+ New Reminder...]    │
├────────────────────────────┤
│  ⏱  Timers                 │
│     🍅 Focus - 18:42       │
│     [+ New Timer...]       │
├────────────────────────────┤
│  🐾  Pet                   │
│     [Hide Pet]             │
│     [Character...]         │
├────────────────────────────┤
│  ⚙  Settings               │
│  🚪  Quit ROA              │
└────────────────────────────┘
```

---

## 7. Notifications

### 7.1 Windows Toast

```
┌────────────────────────────────────────────┐
│ 🐾 ROA                    [×]              │
├────────────────────────────────────────────┤
│                                            │
│  ⏰  Drink water                           │
│  It's been 30 minutes since your last     │
│  glass of water. Stay hydrated!           │
│                                            │
│  [Snooze 10m]  [Done]  [Open Dashboard]   │
│                                            │
└────────────────────────────────────────────┘
```

### 7.2 In-Pet Speech Bubble

```
     ┌─────────────────────┐
     │ Time for water! 💧  │
     │      [×]            │
     └──────────┬──────────┘
                │
           [Pet Sprite]
```

**Auto-dismiss**: 10 seconds (configurable)
**Max concurrent**: 1 bubble
**Queue**: Additional messages wait

---

## 8. Accessibility

### 8.1 Dashboard
- Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ARIA labels on all interactive elements
- Focus visible outlines (2px primary color, 2px offset)
- Screen reader announcements for live regions (timer countdown, reminder triggers)
- Color contrast: WCAG AA minimum (4.5:1 text, 3:1 UI)
- High contrast mode support (Windows setting)

### 8.2 Pet Window
- Screen reader: Announce reminder triggers via `aria-live`
- Reduced motion: Disables all pet animations except state changes
- High contrast: Character manifest provides high-contrast variant
- Keyboard: Global shortcut to focus pet (Win+Alt+R)

---

## 9. Responsive / Adaptive

### 9.1 Dashboard Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 700px | Sidebar collapses to drawer, cards stack |
| Tablet | 700-1000px | Sidebar icon-only, content comfortable |
| Desktop | 1000-1400px | Full sidebar, two-column cards |
| Wide | > 1400px | Max-width 1200px centered, generous spacing |

### 9.2 Pet Window
- Fixed size (character-defined, typically 150-300px)
- Position constrained to visible work area
- Auto-reposition on display topology change

---

## 10. Empty & Error States

### 10.1 Empty States

| Context | Illustration | Message | Action |
|---------|--------------|---------|--------|
| No reminders | 📭 | "No reminders yet" | [Create First Reminder] |
| No timers | ⏱ | "No active timers" | [Start Pomodoro] |
| No characters | 🎭 | "No characters installed" | [Import Character] |
| AI not configured | 🤖 | "AI not set up" | [Configure in Settings] |
| Search no results | 🔍 | "No matches for 'query'" | [Clear Search] |

### 10.2 Error States

| Error Type | Presentation | Recovery |
|------------|--------------|----------|
| Reminder create failed | Toast + inline form error | Retry button |
| AI request failed | Chat message: "AI unavailable. Core features still work." | [Retry] [Open Settings] |
| Character import invalid | Modal with validation errors | [Choose Different File] |
| Database error | Critical: Dashboard banner + log | [Restart App] [Report] |

---

## 11. Onboarding (First Run)

```
┌────────────────────────────────────────────┐
│  Welcome to ROA!          [Skip]           │
├────────────────────────────────────────────┤
│                                            │
│  [Character Preview Animation]             │
│                                            │
│  Meet Roa Cat, your desktop companion.    │
│                                            │
│  [Choose Character]  [Continue with Roa]  │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  Quick Setup                               │
├────────────────────────────────────────────┤
│                                            │
│  ☑ Launch at Windows startup               │
│  ☑ Show notifications                      │
│  ☐ Enable AI Assistant (optional)          │
│                                            │
│  [Finish Setup]                            │
└────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│  You're all set!                           │
├────────────────────────────────────────────┤
│                                            │
│  Roa Cat is now on your desktop.          │
│                                            │
│  • Right-click for menu                   │
│  • Double-click for dashboard             │
│  • Drag to reposition                     │
│                                            │
│  [Open Dashboard]  [Close]                │
└────────────────────────────────────────────┘
```

---

## 12. Asset Requirements

### 12.1 Character Assets (Per Character)

| Asset | Format | Size | Notes |
|-------|--------|------|-------|
| Preview | PNG | 200×200 | Dashboard gallery |
| Idle | PNG (sprite strip) | ~200×200/frame | 8 frames @ 8fps |
| Walk | PNG (sprite strip) | ~200×200/frame | 6 frames @ 12fps |
| Sleep | PNG (sprite strip) | ~200×200/frame | 4 frames @ 4fps |
| Happy | PNG (sprite strip) | ~200×200/frame | 6 frames @ 10fps, once |
| Sad | PNG (sprite strip) | ~200×200/frame | 4 frames @ 6fps, once |
| Speak | PNG (sprite strip) | ~200×200/frame | 3 frames @ 8fps, loop |
| Spritesheet (opt) | PNG | Variable | TexturePacker format |
| Atlas (opt) | JSON | Variable | TexturePacker format |

### 12.2 Application Assets

| Asset | Format | Sizes |
|-------|--------|-------|
| App Icon | ICO + PNG | 16, 24, 32, 48, 64, 128, 256, 512 |
| Tray Icon | PNG | 16, 24, 32 (light/dark variants) |
| Splash Screen | PNG | 800×500 |
| Installer Banner | BMP | 500×100 (NSIS) |

---

## 13. Design Tokens (Tailwind Config Preview)

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        // Semantic aliases (light/dark via CSS variables)
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surfaceElevated: 'var(--color-surface-elevated)',
        border: 'var(--color-border)',
        primary: 'var(--color-primary)',
        primaryHover: 'var(--color-primary-hover)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        text: 'var(--color-text-primary)',
        textSecondary: 'var(--color-text-secondary)',
        textMuted: 'var(--color-text-muted)',
      },
      spacing: {
        0: '0',
        1: '4px', 2: '8px', 3: '12px', 4: '16px',
        5: '20px', 6: '24px', 8: '32px', 10: '40px',
        12: '48px', 16: '64px',
      },
      borderRadius: {
        none: '0',
        sm: '4px', base: '8px', md: '12px',
        lg: '16px', xl: '24px', full: '9999px',
      },
      animation: {
        'in-fast': 'fadeIn 100ms var(--ease-out)',
        'in-base': 'fadeIn 200ms var(--ease-out)',
        'in-slow': 'slideIn 300ms var(--ease-out)',
        'out-fast': 'fadeOut 100ms var(--ease-in)',
        'spring': 'spring 400ms var(--ease-spring)',
        'bounce-gentle': 'bounceGentle 500ms var(--ease-bounce)',
      },
      transitionDuration: {
        instant: '0ms',
        fast: '100ms',
        base: '200ms',
        slow: '300ms',
        'slow+': '500ms',
      },
    },
  },
}
```

---

## 14. Implementation Priority (UI)

| Phase | Components | Dependencies |
|-------|------------|--------------|
| 1 | Pet window + sprite animation engine | Character manifest, asset loading |
| 2 | Dashboard shell (sidebar, routing, theme) | React Router, Zustand, Tailwind |
| 3 | Reminders CRUD + list | IPC, SQLite, Zod |
| 4 | Timers + Pomodoro | IPC, SQLite |
| 5 | Settings pages | IPC, SQLite, safeStorage |
| 6 | AI Chat UI | AI Provider, tool pipeline |
| 7 | Character gallery + import | FS dialog, ZIP, validation |
| 8 | System tray + notifications | Electron APIs |
| 9 | Polish: motion, accessibility, edge cases | All above |

---

## 15. References & Inspiration

- **Motion**: Emil Kowalski (emilkowal.ski), Transitions.dev
- **Design Systems**: Linear, Raycast, Vercel, GitHub
- **Desktop Pet Heritage**: Microsoft Agent, BonziBUDDY, Neko, Shimeji
- **Modern Companions**: Petter, Desktop Pet (Steam), KinitoPET
- **Accessibility**: WAI-ARIA Authoring Practices, Microsoft Fluent 2