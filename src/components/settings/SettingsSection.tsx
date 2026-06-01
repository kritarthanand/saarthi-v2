import { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Props = {
  title: string;
  children: ReactNode;
  // Render the children outside the rounded card (used by Coach Style,
  // where the cards themselves are the section body).
  bare?: boolean;
};

export function SettingsSection({ title, children, bare = false }: Props) {
  return (
    <View className="mb-6">
      <Text className="text-fg mb-3 text-base font-semibold">{title}</Text>
      {bare ? children : <View className="bg-bg-card rounded-2xl p-4">{children}</View>}
    </View>
  );
}

export function SettingsRow({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View>
      {label ? (
        <Text className="text-fg-dim mb-2 text-[11px] uppercase tracking-widest">
          {label}
        </Text>
      ) : null}
      {children}
      {hint ? (
        <Text className="text-fg-faint mt-1.5 text-xs">{hint}</Text>
      ) : null}
    </View>
  );
}
