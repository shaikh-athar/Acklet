// packages/tool-shell/src/models/tool-shell.models.ts
import { Type } from '@angular/core';

export interface ToolTab {
  id: string;
  label: string;
  icon?: string;
  component?: Type<any>;
  badge?: string | number;
  keepAlive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

export interface GutterConfig {
  enabled: boolean;
  width?: number; // default 160px
}

export interface ToolShellConfig {
  activeTabId?: string;
  tabs?: ToolTab[];
  gutter?: GutterConfig;
  showAboutTab?: boolean;
  showDescriptionCard?: boolean;
  showSidebar?: boolean;
  showTopbar?: boolean;
  layout?: 'standard' | 'fullBleed';
}
