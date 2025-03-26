declare module 'react-colorful' {
  import React from 'react';

  export interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
  }

  export const HexColorPicker: React.FC<ColorPickerProps>;
  export const RgbColorPicker: React.FC<ColorPickerProps>;
  export const HslColorPicker: React.FC<ColorPickerProps>;
}
