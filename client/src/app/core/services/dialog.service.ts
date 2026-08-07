import { Injectable, signal } from '@angular/core';

export interface DialogData {
  type: 'alert' | 'confirm' | 'prompt';
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  expectedValue?: string;
  resolve: (value: any) => void;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly activeDialog = signal<DialogData | null>(null);

  alert(message: string, title = 'Alert'): Promise<void> {
    return new Promise<void>((resolve) => {
      this.activeDialog.set({
        type: 'alert',
        title,
        message,
        resolve: () => {
          this.activeDialog.set(null);
          resolve();
        }
      });
    });
  }

  confirm(message: string, title = 'Confirmation'): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.activeDialog.set({
        type: 'confirm',
        title,
        message,
        resolve: (result: boolean) => {
          this.activeDialog.set(null);
          resolve(result);
        }
      });
    });
  }

  prompt(message: string, placeholder = '', defaultValue = '', title = 'Input Required', expectedValue?: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.activeDialog.set({
        type: 'prompt',
        title,
        message,
        placeholder,
        defaultValue,
        expectedValue,
        resolve: (result: string | null) => {
          this.activeDialog.set(null);
          resolve(result);
        }
      });
    });
  }
}
