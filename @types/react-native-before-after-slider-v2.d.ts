declare module 'react-native-before-after-slider-v2' {
  import { ReactNode } from 'react';
  import { ViewStyle } from 'react-native';

  interface CompareProps {
    initial?: number;
    draggerWidth?: number;
    width: number;
    height: number;
    onMoveStart?: () => void;
    onMoveEnd?: () => void;
    children: ReactNode;
  }

  interface DraggerComponentProps {
    customStyles?: ViewStyle;
    children?: ReactNode;
  }

  export const Before: React.FC<{ children: ReactNode }>;
  export const After: React.FC<{ children: ReactNode }>;
  export const Dragger: React.FC<{ children?: ReactNode }>;
  export const DefaultDragger: React.FC<DraggerComponentProps>;

  const Compare: React.FC<CompareProps>;
  export default Compare;
} 