import React from 'react';
import { SectionLabel } from '../ui/SectionLabel';
import { Divider } from '../ui/Divider';
import { Toggle } from '../ui/Toggle';
import { KeycapBadge } from '../ui/KeycapBadge';
import { StatusPip } from '../ui/StatusPip';
import { Input } from '../ui/Input';
import { SettingsRow } from './SettingsRow';

export interface DesktopSettingsProps {
  startWithWindows: boolean;
  shortcutRegistered: boolean;
  lowBatteryNotif: boolean;
  lowBatteryThreshold: number;
  onToggleStartWithWindows: () => void;
  onToggleLowBatteryNotif: () => void;
  onLowBatteryThresholdChange: (value: number) => void;
}

export const DesktopSettings: React.FC<DesktopSettingsProps> = ({
  startWithWindows,
  shortcutRegistered,
  lowBatteryNotif,
  lowBatteryThreshold,
  onToggleStartWithWindows,
  onToggleLowBatteryNotif,
  onLowBatteryThresholdChange,
}) => {
  return (
    <div className="space-y-6">
      <SectionLabel>DESKTOP</SectionLabel>

      <div>
        <SettingsRow
          label="Launch at startup"
          description="Open Roa automatically when Windows starts"
        >
          <Toggle checked={startWithWindows} onChange={onToggleStartWithWindows} />
        </SettingsRow>

        <Divider />

        <SettingsRow
          label="Global shortcut"
          description="Press this anywhere to open Roa"
        >
          <div className="flex items-center gap-2">
            <KeycapBadge keys={['Ctrl', 'Shift', 'Space']} />
            <StatusPip
              color={shortcutRegistered ? 'sage' : 'red'}
              label={shortcutRegistered ? 'Active' : 'Unavailable'}
            />
          </div>
        </SettingsRow>

        <Divider />

        <SettingsRow
          label="System tray"
          description="Roa stays in your system tray"
        >
          <StatusPip color="sage" label="Active" />
        </SettingsRow>

        <Divider />

        <SettingsRow
          label="Low battery alert"
          description="Get notified when battery is running low"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="5"
                max="50"
                value={lowBatteryThreshold}
                onChange={(e) => onLowBatteryThresholdChange(parseInt(e.target.value, 10) || 20)}
                className="w-16 px-2 py-1 text-xs text-center font-mono bg-roa-raised border border-roa-border rounded-roa-sm focus:outline-none focus:border-roa-sage focus:ring-1 focus:ring-roa-sage"
              />
              <span className="text-xs text-roa-text-muted">%</span>
            </div>
            <Toggle checked={lowBatteryNotif} onChange={onToggleLowBatteryNotif} />
          </div>
        </SettingsRow>
      </div>
    </div>
  );
};
