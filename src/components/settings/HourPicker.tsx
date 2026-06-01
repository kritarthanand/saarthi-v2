import { ChipPicker } from './ChipPicker';

function fmtH(h: number): string {
  if (h === 0) return '12 am';
  if (h < 12) return `${h} am`;
  if (h === 12) return '12 pm';
  return `${h - 12} pm`;
}

type Props = {
  options: ReadonlyArray<number>;
  value: number;
  onChange: (next: number) => void;
  a11yLabel?: string;
  disabled?: boolean;
};

export function HourPicker({ options, value, onChange, a11yLabel, disabled }: Props) {
  return (
    <ChipPicker
      options={options.map((h) => ({ label: fmtH(h), value: h }))}
      value={value}
      onChange={onChange}
      a11yLabel={a11yLabel}
      disabled={disabled}
    />
  );
}
