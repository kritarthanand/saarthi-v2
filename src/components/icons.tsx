import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

type IconProps = { size?: number; color?: string };

export const BackIcon = ({ size = 22, color = Colors.text }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevRightIcon = ({ size = 16, color = Colors.textDim }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const ChevDownIcon = ({ size = 14, color = Colors.textDim }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const CheckIcon = ({ size = 14, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const SendIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12l16-8-6 16-3-7-7-1z" fill={color} />
  </Svg>
);

export const MicIcon = ({ size = 18, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x={9} y={3} width={6} height={12} rx={3} fill={color} />
    <Path d="M5 11a7 7 0 0014 0M12 18v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const FlameIcon = ({ size = 14, color = '#F08A3E' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2s5 4 5 9a5 5 0 01-10 0c0-2 1-3 1-3s-1 4 2 4 1-5 2-7c.5-1 0-3 0-3z" fill={color} />
  </Svg>
);

export const DotsIcon = ({ size = 18, color = Colors.textDim }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={6} cy={12} r={1.6} fill={color} />
    <Circle cx={12} cy={12} r={1.6} fill={color} />
    <Circle cx={18} cy={12} r={1.6} fill={color} />
  </Svg>
);

type TabIconProps = { active: boolean; color: string };

export const TabTodayIcon = ({ active, color }: TabIconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={4} y={5} width={16} height={15} rx={2.5} stroke={color} strokeWidth={active ? 2.2 : 1.8} fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
    <Path d="M8 3v4M16 3v4M4 10h16" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" />
  </Svg>
);

export const TabChatIcon = ({ active, color }: TabIconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H10l-4 4v-4H6a2 2 0 01-2-2V6z" stroke={color} strokeWidth={active ? 2.2 : 1.8} fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
  </Svg>
);

export const TabWeekIcon = ({ active, color }: TabIconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={11} width={3.5} height={9} rx={1} stroke={color} strokeWidth={active ? 2.2 : 1.8} fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
    <Rect x={10.25} y={6} width={3.5} height={14} rx={1} stroke={color} strokeWidth={active ? 2.2 : 1.8} fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
    <Rect x={17.5} y={3} width={3.5} height={17} rx={1} stroke={color} strokeWidth={active ? 2.2 : 1.8} fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
  </Svg>
);

export const TabProfileIcon = ({ active, color }: TabIconProps) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={8.5} r={3.5} stroke={color} strokeWidth={active ? 2.2 : 1.8} fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
    <Path d="M5 20c.8-3.5 3.7-5.5 7-5.5s6.2 2 7 5.5" stroke={color} strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" fill={active ? color : 'none'} fillOpacity={active ? 0.18 : 0} />
  </Svg>
);
