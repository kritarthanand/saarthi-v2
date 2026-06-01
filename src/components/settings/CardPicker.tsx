import { Text, TouchableOpacity, View } from 'react-native';

export type CardOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  options: ReadonlyArray<CardOption<T>>;
  value: T;
  onChange: (next: T) => void;
  // 'row'   = equal-width cards in a single row (Coach Style).
  // 'stack' = vertical stack of full-width cards (Voice transport).
  // 'wrap'  = two-column wrap grid (Chat model).
  layout?: 'row' | 'stack' | 'wrap';
  a11yLabel?: string;
  disabled?: boolean;
};

export function CardPicker<T extends string>({
  options,
  value,
  onChange,
  layout = 'stack',
  a11yLabel,
  disabled: groupDisabled = false,
}: Props<T>) {
  const wrapperClass =
    layout === 'row'
      ? 'flex-row gap-3'
      : layout === 'wrap'
      ? 'flex-row flex-wrap gap-2'
      : 'gap-2';

  return (
    <View
      className={wrapperClass}
      accessibilityRole="radiogroup"
      accessibilityLabel={a11yLabel}
    >
      {options.map(({ value: v, label, description, disabled }) => {
        const selected = value === v;
        const isDisabled = disabled || groupDisabled;
        const cardWidth =
          layout === 'row' ? 'flex-1' : layout === 'wrap' ? 'min-w-[47%]' : '';
        return (
          <TouchableOpacity
            key={v}
            disabled={isDisabled}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: isDisabled }}
            accessibilityLabel={label}
            className={`${cardWidth} rounded-2xl border p-3 ${
              selected
                ? 'border-accent bg-accent-dim'
                : 'border-line bg-bg-elev'
            } ${isDisabled ? 'opacity-50' : ''}`}
          >
            <Text
              className={`text-sm font-semibold ${
                description ? 'mb-1' : ''
              } ${selected ? 'text-fg' : 'text-fg-dim'}`}
            >
              {label}
            </Text>
            {description ? (
              <Text className="text-fg-faint text-xs">{description}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
