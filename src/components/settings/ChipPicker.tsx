import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

export type Chip<T extends string | number> = { label: string; value: T };

type Props<T extends string | number> = {
  options: ReadonlyArray<Chip<T>>;
  value: T;
  onChange: (next: T) => void;
  // When true (default), wrap a horizontal ScrollView so long lists pan.
  // Set false for short rows that should wrap with flex.
  scroll?: boolean;
  // accessibilityLabel for the radiogroup wrapper.
  a11yLabel?: string;
  disabled?: boolean;
};

export function ChipPicker<T extends string | number>({
  options,
  value,
  onChange,
  scroll = true,
  a11yLabel,
  disabled = false,
}: Props<T>) {
  const Row = (
    <View
      className={scroll ? 'flex-row gap-2 px-1 py-1' : 'flex-row flex-wrap gap-2'}
      accessibilityRole="radiogroup"
      accessibilityLabel={a11yLabel}
    >
      {options.map(({ label, value: v }) => {
        const selected = value === v;
        return (
          <TouchableOpacity
            key={String(v)}
            disabled={disabled}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={label}
            className={`rounded-full border px-3 py-1.5 ${
              selected
                ? 'border-accent bg-accent-dim'
                : 'border-line-strong bg-bg-elev'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <Text
              className={`text-sm font-medium ${
                selected ? 'text-accent' : 'text-fg-dim'
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (!scroll) return Row;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-1"
    >
      {Row}
    </ScrollView>
  );
}
