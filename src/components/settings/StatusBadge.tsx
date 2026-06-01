import { Text } from 'react-native';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const COPY: Record<SaveStatus, string | null> = {
  idle: null,
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed',
};

const COLOR: Record<SaveStatus, string> = {
  idle: 'text-transparent',
  saving: 'text-fg-faint',
  saved: 'text-green',
  error: 'text-danger',
};

export function StatusBadge({ status }: { status: SaveStatus }) {
  const label = COPY[status];
  if (!label) return null;
  return (
    <Text className={`text-[11px] ${COLOR[status]}`} accessibilityLiveRegion="polite">
      {label}
    </Text>
  );
}
