// apps/tool-online-clipboard/src/app/app.component.spec.ts
import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, ToolRegistryItem } from '@acklet/tool-registry';

describe('Online Clipboard Tool Shell & Canvas Guard', () => {
  const manifest: ToolRegistryItem = TOOL_REGISTRY['clipboard'];

  it('should have a registered clipboard tool manifest', () => {
    expect(manifest).toBeDefined();
    expect(manifest.slug).toBe('clipboard');
    expect(manifest.name).toBe('Online Clipboard');
  });

  it('must have functional tabs defined and not be empty or only about', () => {
    expect(manifest.tabs).toBeDefined();
    expect(manifest.tabs!.length).toBeGreaterThan(0);
    
    // Default functional tab must not be 'about'
    const nonAboutTabs = manifest.tabs!.filter(t => t.id !== 'about');
    expect(nonAboutTabs.length).toBeGreaterThan(0);
    expect(nonAboutTabs[0].id).toBe('send');
  });

  it('should guarantee that live tools in registry have a valid functional tab configuration', () => {
    const liveTools = Object.values(TOOL_REGISTRY).filter(t => t.status === 'live');
    for (const tool of liveTools) {
      if (tool.tabs && tool.tabs.length > 0) {
        const functionalTabs = tool.tabs.filter(t => t.id !== 'about');
        expect(functionalTabs.length).toBeGreaterThan(0);
      }
    }
  });
});
