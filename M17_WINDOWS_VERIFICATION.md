# M17 — Desktop Shell Reliability: Windows Verification Checklist

**Date:** 2026-10-29  
**Milestone:** M17 — Desktop Shell & OS Integration Reliability

## Prerequisites

- ROA development environment configured
- Windows 10/11 laptop
- Terminal with administrator privileges (if testing startup settings)

## How to Run ROA for Testing

```powershell
cd C:\Users\raon3\OneDrive\Desktop\Antigrav-projects\roa-desktop-companion
npm run dev
```

The application will launch with:
- Dashboard window (900x650px)
- Floating pet window (200x200px, bottom-right by default)
- System tray icon

## Test Sequence

### 1. Initial Launch Behavior

**Verify:**
- [ ] Application launches without errors
- [ ] Dashboard window appears
- [ ] Pet window appears (if pet.visible setting is enabled)
- [ ] System tray icon is visible in notification area
- [ ] Terminal shows initialization logs without errors
- [ ] No duplicate initialization warnings appear

**Expected Terminal Output:**
```
[Main] ROA starting up...
[SystemService] Initializing system integration services...
[SystemService] Registered global shortcut: CommandOrControl+Shift+Space
[TimerEngine] Initializing local timer engine...
[ReminderEngine] Initializing local reminder engine...
[Main] ROA shell initialized successfully...
```

**What to Check:**
- Look for "Already initialized" warnings (should NOT appear on first launch)
- Verify shortcut registration succeeded
- Confirm no duplicate service initialization messages

---

### 2. Global Keyboard Shortcut

**Shortcut:** `Ctrl+Shift+Space` (Windows) / `Cmd+Shift+Space` (Mac)

**Test Cases:**

#### 2.1 Toggle Dashboard with Shortcut
- [ ] Press `Ctrl+Shift+Space` — dashboard should appear and gain focus
- [ ] Press `Ctrl+Shift+Space` again — dashboard should hide
- [ ] Press `Ctrl+Shift+Space` again — dashboard should reappear

**Expected Behavior:**
- Dashboard toggles between visible and hidden
- Pet window remains visible throughout (independent lifecycle)
- Terminal logs: `[SystemService] Global shortcut triggered! Toggling dashboard...`

#### 2.2 Rapid Repeated Presses
- [ ] Press `Ctrl+Shift+Space` rapidly 5-10 times
- [ ] Dashboard should toggle consistently
- [ ] No duplicate shortcut registrations in terminal
- [ ] No errors or crashes

#### 2.3 Dashboard Destroyed Handling
- [ ] Close dashboard via window X button (not quit from tray)
- [ ] Press `Ctrl+Shift+Space`
- [ ] Dashboard should recreate and appear
- [ ] No errors in terminal

---

### 3. System Tray Behavior

**Location:** Windows notification area (bottom-right taskbar)

#### 3.1 Tray Icon and Tooltip
- [ ] ROA icon visible in system tray
- [ ] Hover over icon shows "ROA — Desktop Companion" tooltip

#### 3.2 Left-Click Behavior
- [ ] Hide dashboard (via shortcut or close button)
- [ ] Left-click tray icon
- [ ] Dashboard should reappear and gain focus

#### 3.3 Right-Click Context Menu
- [ ] Right-click tray icon to open context menu
- [ ] Verify menu items present:
  - [ ] "Open ROA"
  - [ ] "Pet Mode" submenu (Normal / Click-Through / Hidden)
  - [ ] "Pet Mood" submenu (Idle / Happy / Sleeping)
  - [ ] "Pomodoro" submenu (Start Focus, Breaks, Pause/Resume)
  - [ ] "Settings"
  - [ ] "Quit"

#### 3.4 Tray Actions
- [ ] Click "Open ROA" — dashboard appears
- [ ] Select Pet Mode → Hidden — pet disappears
- [ ] Select Pet Mode → Normal — pet reappears
- [ ] Click "Settings" — dashboard opens

---

### 4. Dashboard Window Lifecycle

#### 4.1 Close vs. Quit Behavior
- [ ] Close dashboard using window X button
- [ ] Dashboard hides but app remains in tray (does NOT quit)
- [ ] Pet window remains visible
- [ ] Timer/reminder services continue running
- [ ] Tray icon remains present

#### 4.2 Minimize and Restore
- [ ] Minimize dashboard
- [ ] Dashboard appears in taskbar
- [ ] Click taskbar icon to restore
- [ ] Dashboard reappears normally

#### 4.3 Show/Hide Consistency
- [ ] Hide dashboard (X button or shortcut)
- [ ] Show via tray click
- [ ] Show via shortcut
- [ ] Show via "second-instance" (launch app again while running)
- [ ] Each method should restore the same dashboard instance (no duplicates)

#### 4.4 Preventing Duplicate Windows
- [ ] Launch ROA (dashboard appears)
- [ ] Attempt to launch ROA again (from Start Menu or desktop)
- [ ] Second launch should activate existing instance, not create duplicate
- [ ] Terminal shows: `[Main] Another instance is already running...` for second attempt

---

### 5. Pet Window Lifecycle

#### 5.1 Independence from Dashboard
- [ ] Close dashboard (X button)
- [ ] Pet window remains visible
- [ ] Pet responds to timer/reminder events
- [ ] Pet can be dragged to new position
- [ ] Position saves when moved

#### 5.2 Pet Visibility Settings
- [ ] Hide pet via tray menu → Pet Mode → Hidden
- [ ] Pet disappears
- [ ] Close dashboard and relaunch app
- [ ] Pet should remain hidden (setting persisted)
- [ ] Show pet via tray menu → Pet Mode → Normal
- [ ] Pet reappears

#### 5.3 Destroyed Pet Handling
- [ ] Force-close pet window (if possible through Task Manager or dev tools)
- [ ] Show pet via tray menu
- [ ] New pet window should be created
- [ ] No errors in terminal

---

### 6. Startup and Shutdown

#### 6.1 Clean Startup
- [ ] Launch ROA
- [ ] Check terminal for initialization sequence
- [ ] Verify no duplicate initialization warnings
- [ ] All services initialize exactly once

**Expected Log Order:**
1. Database initialization
2. Settings & Character Registry
3. Window Manager
4. ReminderEngine init
5. TimerEngine init
6. SystemService init (including shortcut)
7. Tray init

#### 6.2 Clean Shutdown via Tray Quit
- [ ] Right-click tray icon → Quit
- [ ] All windows close
- [ ] Terminal shows shutdown sequence:

```
[SystemService] Shutting down system services...
[TimerEngine] Shutting down timer engine...
[ReminderEngine] Shutting down reminder engine...
```

- [ ] Tray icon disappears
- [ ] App process terminates
- [ ] No lingering processes in Task Manager

#### 6.3 Shutdown via Task Manager
- [ ] Launch ROA
- [ ] Open Task Manager
- [ ] End ROA task
- [ ] App closes without errors
- [ ] No zombie processes remain

---

### 7. Service Lifecycle

#### 7.1 Reminder Service Continues When Dashboard Hidden
- [ ] Create a reminder for 1 minute from now
- [ ] Hide dashboard
- [ ] Wait for reminder to trigger
- [ ] Native notification should appear (or fallback toast if notifications disabled)
- [ ] Pet should show reaction if visible
- [ ] Dashboard can be reopened to see reminder in history

#### 7.2 Timer Service Continues When Dashboard Hidden
- [ ] Start a 1-minute timer
- [ ] Hide dashboard
- [ ] Wait for timer to complete
- [ ] Notification should appear
- [ ] Pet should show completion reaction if visible

#### 7.3 Pomodoro via Tray
- [ ] Right-click tray → Pomodoro → Start Focus (25m)
- [ ] Hide dashboard
- [ ] Timer runs in background
- [ ] Can pause/resume via tray menu without showing dashboard

---

### 8. System Resume and Sleep

**Note:** These tests verify recovery after system suspend/resume.

#### 8.1 Timer Recovery After Sleep
- [ ] Start a 5-minute timer
- [ ] Put computer to sleep for 1 minute
- [ ] Wake computer
- [ ] Timer should detect elapsed time and complete if overdue
- [ ] Terminal shows: `[TimerEngine] System resumed. Performing timer recovery...`

#### 8.2 Reminder Recovery After Sleep
- [ ] Set reminder for current time + 2 minutes
- [ ] Put computer to sleep for 3 minutes
- [ ] Wake computer
- [ ] Reminder should trigger on wake (catch-up)
- [ ] Terminal shows: `[ReminderEngine] System resumed from sleep. Performing recovery...`

---

### 9. Error Conditions and Edge Cases

#### 9.1 Shortcut Registration Failure
- [ ] Launch another app that uses `Ctrl+Shift+Space`
- [ ] Launch ROA
- [ ] Check terminal for shortcut registration error
- [ ] Expected: `[SystemService] Failed to register global shortcut...`
- [ ] App should still function (tray, windows work)

#### 9.2 Tray Icon Missing
- [ ] If tray icon doesn't load, check terminal for errors
- [ ] App should still be controllable via taskbar
- [ ] Dashboard shortcut should still work

#### 9.3 Notification Permissions Disabled
- [ ] Disable Windows notifications for ROA
- [ ] Trigger a reminder or timer
- [ ] In-app toast fallback should appear on dashboard
- [ ] Terminal shows: `[ReminderEngine] Notification blocked by Windows settings...`

---

### 10. Development Mode Verification

**Development-specific checks:**

- [ ] Hot reload works for renderer changes
- [ ] Main process restarts properly on changes
- [ ] Terminal shows clear error messages for issues
- [ ] DevTools accessible via View menu or Ctrl+Shift+I

---

## Terminal Log Monitoring

During all tests, monitor the terminal for:

### ✅ Expected Logs (Normal)
- Service initialization messages
- Global shortcut registration success
- Timer/reminder triggering
- System resume recovery messages

### ⚠️ Warning Signs (Should NOT Appear)
- "Already initialized. Skipping duplicate init."
- "Database not initialized"
- Duplicate shortcut registration attempts
- Multiple tray initialization messages
- Memory leaks or unhandled promise rejections

### ❌ Errors (Investigate Immediately)
- Unhandled exceptions
- "Cannot read property of null" for windows
- Shortcut registration failures (unless another app conflicts)
- Database errors
- IPC handler errors

---

## Success Criteria

M17 Windows verification is successful when:

1. ✅ All test cases pass without errors
2. ✅ No duplicate service initialization occurs
3. ✅ Global shortcut works reliably across all scenarios
4. ✅ Tray icon and menu function correctly
5. ✅ Dashboard and pet windows have independent, correct lifecycles
6. ✅ Shutdown cleans up all resources
7. ✅ Services continue operating when windows are hidden
8. ✅ System resume recovery works for timers and reminders
9. ✅ No crashes, hangs, or resource leaks observed

---

## Known Limitations

The following cannot be verified through automated tests and require manual Windows testing:

1. **Actual keyboard shortcut triggering** — Mocked in tests, must verify in real app
2. **Native Windows notifications** — Must test with Windows 10/11 notification system
3. **System tray icon visibility** — Platform-specific rendering
4. **Window focus and z-order** — OS window manager behavior
5. **System sleep/wake** — Requires actual power management events
6. **Taskbar integration** — Windows-specific taskbar behavior

---

## Reporting Issues

If any test fails, document:
1. Test case that failed
2. Expected behavior
3. Actual behavior
4. Terminal output / error messages
5. Screenshots if applicable
6. Steps to reproduce

---

## Next Steps After Verification

Once all tests pass:
1. Note any findings in M17 completion report
2. If defects found, create targeted fixes
3. Rerun automated tests after fixes
4. Re-verify affected Windows GUI scenarios
5. Proceed to commit with descriptive message
