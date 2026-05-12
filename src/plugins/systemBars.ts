import { registerPlugin } from '@capacitor/core';

interface SystemBarsPlugin {
  hide(): Promise<void>;
  show(): Promise<void>;
}

export const SystemBars = registerPlugin<SystemBarsPlugin>('SystemBars');
