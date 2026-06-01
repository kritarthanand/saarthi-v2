import Svg, { Defs, RadialGradient, LinearGradient, Stop, Path, Ellipse } from 'react-native-svg';

// Peacock-feather mark (mor pankh) — Krishna's plume.
export function SaarthiLogo({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Defs>
        <RadialGradient id="feather-eye" cx="0.5" cy="0.42" r="0.62">
          <Stop offset="0" stopColor="#FFD66B" />
          <Stop offset="0.32" stopColor="#E89A3C" />
          <Stop offset="0.55" stopColor="#7A4BA8" />
          <Stop offset="0.78" stopColor="#1F6FA8" />
          <Stop offset="1" stopColor="#0E3F66" />
        </RadialGradient>
        <LinearGradient id="feather-plume" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#3FBF8F" />
          <Stop offset="0.5" stopColor="#1F8FB5" />
          <Stop offset="1" stopColor="#1B5E8E" />
        </LinearGradient>
        <LinearGradient id="feather-stem" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor="#1B5E8E" />
          <Stop offset="1" stopColor="#0E3F66" />
        </LinearGradient>
      </Defs>

      <Path
        d="M16 1.6 C 22.5 3.6, 26 9, 25.4 14.6 C 25 18, 23 20.4, 20 21.4 C 18.4 22, 17 22.4, 16 22.6 C 15 22.4, 13.6 22, 12 21.4 C 9 20.4, 7 18, 6.6 14.6 C 6 9, 9.5 3.6, 16 1.6 Z"
        fill="url(#feather-plume)"
      />
      <Path
        d="M16 3.2 C 21 5, 23.6 9.4, 23.2 13.8 C 22.9 16.2, 21.4 18, 19.2 18.8 C 17.8 19.3, 16.7 19.5, 16 19.6 C 15.3 19.5, 14.2 19.3, 12.8 18.8 C 10.6 18, 9.1 16.2, 8.8 13.8 C 8.4 9.4, 11 5, 16 3.2 Z"
        fill="#2EA0C2"
        opacity={0.55}
      />
      <Ellipse cx={16} cy={12.2} rx={5.2} ry={6.2} fill="url(#feather-eye)" />
      <Ellipse cx={16} cy={12.2} rx={3.2} ry={3.9} fill="#1F2E5A" />
      <Ellipse cx={16} cy={11.4} rx={1.7} ry={2.2} fill="#0A1330" />
      <Ellipse cx={15.2} cy={10.4} rx={0.6} ry={0.9} fill="#FFE9B0" opacity={0.85} />
      <Path
        d="M15.5 22.2 C 15.2 24.6, 14.8 27, 14.2 29.6 L 15.6 30 C 16.2 27.4, 16.7 25, 17 22.6 Z"
        fill="url(#feather-stem)"
      />
    </Svg>
  );
}
