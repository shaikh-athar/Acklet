import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

export interface TabEmptyConfig {
  icon: string;
  title: string;
  subtitle: string;
  quote: string;
  accentColor: string;
}

@Component({
  selector: 'app-inspector-empty-state',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div
      class="inspector-empty-dropzone"
      [class.is-drag-over]="isDraggingOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="empty-watermark-container">
        <div class="empty-watermark-icon-box">
          <app-icon [name]="activeConfig().icon" class="empty-watermark-icon"></app-icon>
        </div>
        <div class="empty-watermark-title">{{ customTitle() || activeConfig().title }}</div>
        <div class="empty-watermark-subtitle">{{ customSubtitle() || activeConfig().subtitle }}</div>
      </div>
    </div>
  `,
  styleUrls: ['../data-lens.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InspectorEmptyStateComponent {
  tab = input<string>('tree');
  activeFormat = input<string>('json');
  customTitle = input<string>('');
  customSubtitle = input<string>('');

  fileContentDropped = output<string>();

  isDraggingOver = signal<boolean>(false);

  readonly formatLabel = computed(() => {
    const fmt = this.activeFormat();
    if (fmt === 'yaml') return 'YAML';
    if (fmt === 'xml') return 'XML';
    if (fmt === 'csv') return 'CSV';
    if (fmt === 'toml') return 'TOML';
    if (fmt === 'curl') return 'cURL command';
    return 'JSON';
  });

  readonly tabConfigs: Record<string, TabEmptyConfig> = {
    tree: {
      icon: 'folder-tree',
      title: 'Add data on the left to start inspecting',
      subtitle: 'Paste or import data in the editor to explore structure',
      quote: '',
      accentColor: 'var(--tool-accent, rgba(37, 99, 235, 0.4))'
    },
    table: {
      icon: 'table-2',
      title: 'Add table array on the left',
      subtitle: 'Paste or import an array of records to view rows',
      quote: '',
      accentColor: 'rgba(59, 130, 246, 0.4)'
    },
    stats: {
      icon: 'bar-chart-2',
      title: 'Add data on the left to view metrics',
      subtitle: 'Paste or import data to calculate schema statistics',
      quote: '',
      accentColor: 'rgba(139, 92, 246, 0.4)'
    },
    graph: {
      icon: 'network',
      title: 'Add data on the left to render graph',
      subtitle: 'Paste or import data to explore node relations',
      quote: '',
      accentColor: 'rgba(16, 185, 129, 0.4)'
    },
    jsonpath: {
      icon: 'search-code',
      title: 'Add data on the left to query paths',
      subtitle: 'Paste or import data to query JSONPath expressions',
      quote: '',
      accentColor: 'rgba(245, 158, 11, 0.4)'
    },
    codegen: {
      icon: 'code-2',
      title: 'Add JSON on the left to generate code',
      subtitle: 'Paste or import a JSON payload in the Input editor to generate TypeScript, Python & Go types',
      quote: '',
      accentColor: 'rgba(236, 72, 153, 0.4)'
    }
  };

  readonly activeConfig = computed(() => {
    const key = this.tab().toLowerCase();
    const base = this.tabConfigs[key] || this.tabConfigs['tree'];
    const fmt = this.formatLabel();
    return {
      ...base,
      title: base.title.replace('JSON', fmt),
      subtitle: base.subtitle.replace('a JSON payload', `${fmt} content`).replace('JSON payload', `${fmt} content`)
    };
  });

  onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.isDraggingOver.set(false);

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.readFile(e.dataTransfer.files[0]);
    }
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.readFile(input.files[0]);
    }
  }

  private readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        this.fileContentDropped.emit(text);
      }
    };
    reader.readAsText(file);
  }
}
