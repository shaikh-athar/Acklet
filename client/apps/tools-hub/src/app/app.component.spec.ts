// apps/tools-hub/src/app/app.component.spec.ts
import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { HubHomeComponent } from '@acklet/tool-shell';

describe('ToolsHub HubHomeComponent', () => {
  it('should initialize and load live tools from registry', () => {
    const hub = new HubHomeComponent();
    expect(hub).toBeTruthy();

    const liveTools = hub.liveTools();
    expect(liveTools.length).toBeGreaterThan(0);
    expect(liveTools.some(t => t.slug === 'clipboard')).toBe(true);

    const categoryGroups = hub.categoryGroups();
    expect(categoryGroups.length).toBeGreaterThan(0);
    expect(categoryGroups.some(g => g.category === 'Utilities')).toBe(true);
  });

  it('should filter tools by search query', () => {
    const hub = new HubHomeComponent();
    hub.onSearchChange('clipboard');
    expect(hub.filteredTools().length).toBe(1);
    expect(hub.filteredTools()[0].slug).toBe('clipboard');

    hub.onSearchChange('nonexistent-query-xyz');
    expect(hub.filteredTools().length).toBe(0);
  });

  it('should manage category selection and clear filters', () => {
    const hub = new HubHomeComponent();
    hub.selectCategory('Utilities');
    expect(hub.selectedCategory()).toBe('Utilities');

    hub.clearAllFilters();
    expect(hub.selectedCategory()).toBe('ALL');
    expect(hub.searchQuery()).toBe('');
  });
});
