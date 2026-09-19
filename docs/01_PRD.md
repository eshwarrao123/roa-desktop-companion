# Product Requirements Document (PRD)

## Project: ROA — Desktop Companion/Pet Application

---

## 1. Executive Summary

ROA is a **local-first, Windows-first desktop companion application** featuring a persistent, animated character that lives on the user's desktop. The application combines a delightful "desktop pet" experience with practical productivity tools (reminders, timers, Pomodoro) and optional AI-assisted natural-language interaction.

**Core philosophy**: The application must be fully functional offline. AI is an optional enhancement layer, never a dependency for core features.

---

## 2. Target Audience

- Windows users who want a delightful, persistent desktop companion
- Users seeking lightweight productivity tools (reminders, timers) integrated into a character-driven experience
- Privacy-conscious users who prefer local-first applications
- Optional: Power users who want to connect their own AI provider (Gemini BYOK, Ollama)

---

## 3. Core Features (MVP Scope)

### 3.1 Desktop Pet Window
- Transparent, frameless, borderless window
- Always-on-top (configurable)
- Click-through when not interacting (optional mode)
- Draggable/repositionable
- Low resource footprint

### 3.2 Character System
- Modular character pack architecture (~10 character packs planned)
- Each character: manifest.json + animation assets + preview image
- Support for original characters (animals, anime-inspired, superhero-inspired)
- User-importable character packs
- Character selection/switching UI
- No copyrighted characters in default distribution

### 3.3 Animation & Behavior
- Sprite-based animations (idle, walk, sleep, happy, sad, etc.)
- Mood system affecting behavior and animation selection
- Autonomous movement/walking across screen
- Speech bubbles for communication
- Configurable behavior intensity

### 3.4 Reminder Engine (Core Feature)
- Natural language input (when AI enabled): "Remind me to drink water every 30 minutes"
- Structured reminder definition: title, schedule, enabled state
- Schedule types: one-time, recurring (interval, cron-like), relative
- Persistence in SQLite (source of truth)
- History/log of triggered reminders
- Snooze/dismiss actions
- Survives: app restart, Windows sleep/resume, timer failures
- Recovery/watchdog strategy (not single setInterval)

### 3.5 Timer / Pomodoro
- Countdown timers
- Pomodoro cycles (work/break intervals)
- Visual/audio notifications
- Integration with reminder engine

### 3.6 Notifications
- Native Windows toast notifications
- In-app speech bubble notifications
- Sound alerts (configurable)

### 3.7 System Integration
- System tray icon with context menu
- Startup with Windows (optional, user-controlled)
- Battery/status awareness (optional, read-only)

### 3.8 Dashboard Window
- Separate BrowserWindow (lazy-loaded)
- Settings, reminder management, character selection, timer controls
- Statistics/history views

---

## 4. Optional / Future Features (Post-MVP)

| Feature | Category | Notes |
|---------|----------|-------|
| AI Assistant (Gemini BYOK) | AI Layer | Natural language → tool calls |
| AI Assistant (Ollama) | AI Layer | Local LLM option |
| Filesystem Access | Integration | User-approved folders only |
| Gmail Integration | Integration | Read-only, OAuth |
| Outlook / Microsoft Graph | Integration | Read-only, OAuth |
| Licensed Characters | Content | Rights-dependent |
| Plugin System | Architecture | Deferred — avoid premature abstraction |

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Pet window: < 50 MB RAM, < 2% CPU idle
- Dashboard: < 100 MB RAM when open
- 60 FPS animations
- Cold start < 3 seconds

### 5.2 Reliability
- Reminder engine: 99.9% trigger reliability
- Graceful degradation when AI unavailable
- Auto-recovery from scheduler drift

### 5.3 Security
- Context isolation enforced
- No Node.js in renderer
- Narrow, typed IPC surface
- Zod validation on all IPC boundaries
- Secure credential storage (OS keychain)
- No plaintext secrets in SQLite
- Allowlisted AI tools only
- Path traversal prevention

### 5.4 Usability
- Intuitive character interaction
- Accessible dashboard (keyboard navigation, screen readers)
- Sensible defaults, minimal configuration required

### 5.5 Compatibility
- Windows 10/11 (primary)
- x64 and ARM64 builds
- No admin rights required for normal operation

---

## 6. Constraints & Assumptions

| Constraint | Detail |
|------------|--------|
| Platform | Windows-first (macOS/Linux deferred) |
| Runtime | Electron (no Tauri, no Rust) |
| AI | Optional — core features work without it |
| Distribution | No copyrighted characters by default |
| Offline | Core features must work fully offline |
| Dependencies | Locked tech stack (see TRD) |

---

## 7. Success Metrics (MVP)

- Application launches and displays pet within 3s
- Pet animations run at 60 FPS
- Reminders trigger within ±5 seconds of scheduled time across restarts/sleep
- Zero critical security findings in IPC surface
- Dashboard opens and is fully functional
- System tray integration works
- Windows startup registration works

---

## 8. Out of Scope (Explicitly)

- Multi-user / cloud sync
- Mobile companion app
- Web version
- Real-time multiplayer / social features
- Built-in AI model (BYOK only)
- Arbitrary code execution via AI
- Full filesystem scanning
- Email sending / modification
- Plugin marketplace