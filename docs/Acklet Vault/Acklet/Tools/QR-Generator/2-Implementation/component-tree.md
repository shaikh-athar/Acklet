---
tool: QR Generator
phase: 1
last-updated: 2026-10-20
status: Building
---

# Component Tree

## Architecture

```text
QRGeneratorComponent (standalone: true)
  State: currentOptions, qrDataUrl, metadata, isGenerating
  ├── InputPanelComponent (standalone: true)
  │   @Input(): none
  │   @Output(): (contentChange), (typeChange)
  │   └── Textarea + Type Dropdown + Preset Buttons
  │
  └── Two-Column Grid (responsive)
      ├── Column 1 (Left)
      │   ├── PreviewPanelComponent (standalone: true)
      │   │   @Input(): qrDataUrl, metadata, isLoading
      │   │   ├── QRCanvasComponent (standalone: true)
      │   │   │   @Input(): qrDataUrl, isLoading
      │   │   │   └── <img> + Loading Skeleton + Placeholder
      │   │   │
      │   │   └── MetadataDisplayComponent (standalone: true)
      │   │       @Input(): metadata
      │   │       └── Info Grid + Progress Bar
      │   │
      │
      └── Column 2 (Right)
          ├── CustomizationPanelComponent (standalone: true)
          │   @Input(): options
          │   @Output(): (optionsChange)
          │   │
          │   ├── ColorCustomizerComponent (standalone: true)
          │   │   @Input(): foregroundColor, backgroundColor
          │   │   @Output(): (colorChange)
          │   │   └── Two Color Pickers + Contrast Check + Preview
          │   │
          │   ├── SizeSliderComponent (standalone: true)
          │   │   @Input(): size
          │   │   @Output(): (sizeChange)
          │   │   └── Range Slider + Preset Buttons
          │   │
          │   └── ErrorCorrectionSelectorComponent (standalone: true)
          │       @Input(): errorCorrection
          │       @Output(): (ecChange)
          │       └── Dropdown + Tooltip
          │
          └── OutputPanelComponent (standalone: true)
              @Input(): qrDataUrl, isLoading
              │
              └── DownloadButtonComponent (standalone: true)
                  @Input(): qrDataUrl, isLoading
                  └── Download Button + Download Logic
```

## Data Flow

### On Content Change
```text
User types in textarea
  ↓
InputPanelComponent.contentChange.emit(content)
  ↓
QRGeneratorComponent.onContentChange(content)
  ├─ Update: currentOptions.content = content
  ├─ Call: generateQR()
  └─ Service: QRGeneratorService.generateQR(currentOptions)
      └─ Returns: qrDataUrl (Data URL PNG)
  ├─ Update: qrDataUrl = result
  ├─ Call: getMetadata()
  └─ Update: metadata = result
  ↓
PreviewPanelComponent receives new @Input qrDataUrl
  ↓
QRCanvasComponent receives new @Input qrDataUrl
  ↓
Template updates <img [src]="qrDataUrl">
  ↓
User sees updated QR code
```

### On Customization Change
```text
User adjusts color/size/EC
  ↓
CustomizationPanel subcomponent.emit(change)
  ↓
QRGeneratorComponent.onOptionsChange(partial)
  ├─ Merge: currentOptions = {...currentOptions, ...partial}
  └─ Call: generateQR() [same as above]
  ↓
[Same flow as content change]
```

### On Download
```text
User clicks Download button
  ↓
DownloadButtonComponent.downloadQR()
  ├─ Create: <a> element
  ├─ Set: href = qrDataUrl, download = "qr-code-{timestamp}.png"
  ├─ Trigger: link.click()
  └─ Clean up: remove <a> element
  ↓
Browser downloads PNG file
```

## Key Points

- **No state in child components**: All state in QRGeneratorComponent
- **Dumb presentation components**: PreviewPanel, OutputPanel only render; no logic
- **Smart orchestrator**: QRGeneratorComponent owns state, calls services, emits events
- **Services have no state**: Pure functions (generateQR, getMetadata)
- **Responsive grid**: CSS Grid with 2 columns (desktop) → 1 column (mobile)

## Folder Structure in Code

```text
src/app/tools/qr-generator/
├── qr-generator.component.ts
├── qr-generator.component.html
├── qr-generator.component.scss
├── qr-generator.component.spec.ts
├── components/
│   ├── input-panel/
│   │   ├── input-panel.component.ts
│   │   ├── input-panel.component.html
│   │   ├── input-panel.component.scss
│   │
│   ├── preview-panel/
│   │   ├── preview-panel.component.ts
│   │   ├── preview-panel.component.html
│   │   ├── preview-panel.component.scss
│   │   ├── qr-canvas/
│   │   │   ├── qr-canvas.component.ts
│   │   │   ├── qr-canvas.component.html
│   │   │   ├── qr-canvas.component.scss
│   │   │
│   │   └── metadata-display/
│   │       ├── metadata-display.component.ts
│   │       ├── metadata-display.component.html
│   │       ├── metadata-display.component.scss
│   │
│   ├── customization-panel/
│   │   ├── customization-panel.component.ts
│   │   ├── customization-panel.component.html
│   │   ├── customization-panel.component.scss
│   │   ├── color-customizer/
│   │   │   ├── color-customizer.component.ts
│   │   │   ├── color-customizer.component.html
│   │   │   ├── color-customizer.component.scss
│   │   │
│   │   ├── size-slider/
│   │   │   ├── size-slider.component.ts
│   │   │   ├── size-slider.component.html
│   │   │   ├── size-slider.component.scss
│   │   │
│   │   └── error-correction-selector/
│   │       ├── error-correction-selector.component.ts
│   │       ├── error-correction-selector.component.html
│   │       ├── error-correction-selector.component.scss
│   │
│   └── output-panel/
│       ├── output-panel.component.ts
│       ├── output-panel.component.html
│       ├── output-panel.component.scss
│       └── download-button/
│           ├── download-button.component.ts
│           ├── download-button.component.html
│           ├── download-button.component.scss
│
├── services/
│   ├── qr-generator.service.ts
│   ├── qr-generator.service.spec.ts
│   ├── color-validator.service.ts
│   └── color-validator.service.spec.ts
│
└── models/
    └── qr-options.model.ts
```

---

## Standalone Components

All components use `standalone: true`. Import dependencies explicitly in each component's `imports` array.

Example:
```typescript
@Component({
  selector: 'app-input-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, MyChildComponent],
  template: `...`
})
```

No NgModule required.
