// apps/tool-image-compressor/src/components/custom-select/custom-select.component.spec.ts
import { describe, it, expect } from 'vitest';
import { CustomSelectOption } from './custom-select.component';

describe('CustomSelect Data Structure and Options Logic', () => {
  const mockOptions: CustomSelectOption[] = [
    { value: 'none', label: 'Original (No resize)' },
    { value: 'target-size', label: 'Target file size (KB / MB)', badge: 'Exact' },
    { value: 'custom-dim', label: 'Custom dimensions (W × H)' },
    { value: 'disabled-opt', label: 'Unavailable format', disabled: true }
  ];

  it('should define valid options with labels and optional badges', () => {
    expect(mockOptions.length).toBe(4);
    const targetSize = mockOptions.find(o => o.value === 'target-size');
    expect(targetSize).toBeDefined();
    expect(targetSize?.badge).toBe('Exact');
    expect(targetSize?.disabled).toBeUndefined();
  });

  it('should distinguish enabled from disabled options', () => {
    const enabled = mockOptions.filter(o => !o.disabled);
    const disabled = mockOptions.filter(o => o.disabled);

    expect(enabled.length).toBe(3);
    expect(disabled.length).toBe(1);
    expect(disabled[0].value).toBe('disabled-opt');
  });

  it('should resolve selected option matching value', () => {
    const selectedVal = 'target-size';
    const found = mockOptions.find(o => o.value === selectedVal);
    expect(found?.label).toBe('Target file size (KB / MB)');
  });

  it('should handle keyboard navigation indexes cyclically', () => {
    const enabledOptions = mockOptions.filter(o => !o.disabled);
    let activeIndex = 0;

    // Arrow down
    activeIndex = (activeIndex + 1) % enabledOptions.length;
    expect(activeIndex).toBe(1);
    expect(enabledOptions[activeIndex].value).toBe('target-size');

    // Arrow down
    activeIndex = (activeIndex + 1) % enabledOptions.length;
    expect(activeIndex).toBe(2);
    expect(enabledOptions[activeIndex].value).toBe('custom-dim');

    // Arrow down (wraps)
    activeIndex = (activeIndex + 1) % enabledOptions.length;
    expect(activeIndex).toBe(0);
    expect(enabledOptions[activeIndex].value).toBe('none');

    // Arrow up (wraps backward)
    activeIndex = (activeIndex - 1 + enabledOptions.length) % enabledOptions.length;
    expect(activeIndex).toBe(2);
  });
});
