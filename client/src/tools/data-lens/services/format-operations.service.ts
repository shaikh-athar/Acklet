import { Injectable } from '@angular/core';

export type OperationCategory = 'transform' | 'analysis' | 'convert' | 'view';

export interface OperationDefinition {
  id: string;
  label: string;
  icon: string;
  category: OperationCategory;
  tooltip: string;
  isPrimary?: boolean;
  requiresValidPayload?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FormatOperationsService {
  private readonly jsonOperations: OperationDefinition[] = [
    {
      id: 'format',
      label: 'Format',
      icon: 'sparkles',
      category: 'transform',
      tooltip: 'Format & Beautify JSON (⌘/Ctrl + Enter)',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'minify',
      label: 'Minify',
      icon: 'minimize-2',
      category: 'transform',
      tooltip: 'Minify Payload (Remove Whitespace)',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'sortKeys',
      label: 'Sort Keys',
      icon: 'arrow-up-down',
      category: 'transform',
      tooltip: 'Sort Object Keys Alphabetically',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'stringify',
      label: 'Stringify',
      icon: 'quote',
      category: 'transform',
      tooltip: 'Convert JSON Object to Escaped String',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'escape',
      label: 'Escape',
      icon: 'arrow-right-from-line',
      category: 'transform',
      tooltip: 'Escape / Unescape JSON String Value',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'flatten',
      label: 'Flatten',
      icon: 'layers',
      category: 'transform',
      tooltip: 'Flatten Nested Object Keys into Dot Notation',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'unflatten',
      label: 'Unflatten',
      icon: 'layout-grid',
      category: 'transform',
      tooltip: 'Unflatten Dot-Notation Keys into Nested Object',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'removeNulls',
      label: 'Remove Nulls',
      icon: 'filter-x',
      category: 'transform',
      tooltip: 'Strip all null properties recursively',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'stripComments',
      label: 'Remove Comments',
      icon: 'file-text',
      category: 'transform',
      tooltip: 'Strip all // and /* */ comments from JSON',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'removeEmpties',
      label: 'Remove Empties',
      icon: 'trash-2',
      category: 'transform',
      tooltip: 'Strip empty strings, objects, and arrays',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'toCamelCase',
      label: 'to camelCase',
      icon: 'case-lower',
      category: 'transform',
      tooltip: 'Convert all key names to camelCase',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'toSnakeCase',
      label: 'to snake_case',
      icon: 'variable',
      category: 'transform',
      tooltip: 'Convert all key names to snake_case',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'toKebabCase',
      label: 'to kebab-case',
      icon: 'minus',
      category: 'transform',
      tooltip: 'Convert all key names to kebab-case',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'toPascalCase',
      label: 'to PascalCase',
      icon: 'case-upper',
      category: 'transform',
      tooltip: 'Convert all key names to PascalCase',
      isPrimary: false,
      requiresValidPayload: true
    }
  ];

  private readonly yamlOperations: OperationDefinition[] = [
    {
      id: 'format',
      label: 'Format',
      icon: 'sparkles',
      category: 'transform',
      tooltip: 'Format & Beautify YAML',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'sortKeys',
      label: 'Sort Keys',
      icon: 'arrow-up-down',
      category: 'transform',
      tooltip: 'Sort YAML Keys Alphabetically',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'expandAnchors',
      label: 'Expand Anchors & Aliases',
      icon: 'git-fork',
      category: 'transform',
      tooltip: 'Resolve & Expand YAML &anchors and *aliases into full structure',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'stripComments',
      label: 'Remove Comments',
      icon: 'file-text',
      category: 'transform',
      tooltip: 'Strip all # comment lines from YAML',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'tabsToSpaces',
      label: 'Convert Tabs to Spaces',
      icon: 'align-left',
      category: 'transform',
      tooltip: 'Replace invalid tabs with 2 spaces for valid YAML indentation',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'normalizeBooleans',
      label: 'Normalize Booleans & Nulls',
      icon: 'check',
      category: 'transform',
      tooltip: 'Normalize yes/no/on/off/true/false and null values',
      isPrimary: false,
      requiresValidPayload: true
    }
  ];

  private readonly xmlOperations: OperationDefinition[] = [
    {
      id: 'format',
      label: 'Format',
      icon: 'sparkles',
      category: 'transform',
      tooltip: 'Format & Pretty Print XML Document',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'minify',
      label: 'Minify',
      icon: 'minimize-2',
      category: 'transform',
      tooltip: 'Minify XML (Remove Whitespace)',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'stripComments',
      label: 'Remove Comments',
      icon: 'file-text',
      category: 'transform',
      tooltip: 'Strip all <!-- comment --> blocks from XML',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'removePI',
      label: 'Remove Processing Instructions',
      icon: 'code',
      category: 'transform',
      tooltip: 'Strip <?xml-stylesheet ...?> processing instructions',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'sortAttributes',
      label: 'Sort Attributes',
      icon: 'arrow-up-down',
      category: 'transform',
      tooltip: 'Sort XML tag attributes alphabetically',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'normalizeQuotes',
      label: 'Normalize Attribute Quotes',
      icon: 'quote',
      category: 'transform',
      tooltip: 'Convert single-quoted attributes to standard double quotes',
      isPrimary: false,
      requiresValidPayload: true
    }
  ];

  private readonly tomlOperations: OperationDefinition[] = [
    {
      id: 'format',
      label: 'Format',
      icon: 'sparkles',
      category: 'transform',
      tooltip: 'Format & Pretty Print TOML Document',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'sortKeys',
      label: 'Sort Keys',
      icon: 'arrow-up-down',
      category: 'transform',
      tooltip: 'Alphabetically sort keys inside TOML sections & tables',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'normalizeTables',
      label: 'Normalize Tables & Sections',
      icon: 'layout',
      category: 'transform',
      tooltip: 'Clean spacing around [table] section headers',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'normalizeInlineTables',
      label: 'Normalize Inline Tables & Arrays',
      icon: 'brackets',
      category: 'transform',
      tooltip: 'Clean inline table { a = 1 } and array [ 1, 2 ] spacing',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'removeEmpties',
      label: 'Remove Empty Values',
      icon: 'trash-2',
      category: 'transform',
      tooltip: 'Strip empty keys and empty table declarations',
      isPrimary: false,
      requiresValidPayload: true
    }
  ];

  private readonly csvOperations: OperationDefinition[] = [
    {
      id: 'format',
      label: 'Format / Normalize',
      icon: 'sparkles',
      category: 'transform',
      tooltip: 'Normalize CSV Delimiters & Column Alignment',
      isPrimary: true,
      requiresValidPayload: true
    },
    {
      id: 'trimWhitespace',
      label: 'Trim Cell Whitespace',
      icon: 'align-center',
      category: 'transform',
      tooltip: 'Trim leading & trailing whitespace from all CSV cells',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'removeEmptyRows',
      label: 'Remove Empty Rows',
      icon: 'trash-2',
      category: 'transform',
      tooltip: 'Strip completely empty CSV rows',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'removeDuplicateRows',
      label: 'Remove Duplicate Rows',
      icon: 'copy-x',
      category: 'transform',
      tooltip: 'Deduplicate identical CSV data rows',
      isPrimary: false,
      requiresValidPayload: true
    },
    {
      id: 'normalizeQuotes',
      label: 'Normalize Quotes',
      icon: 'quote',
      category: 'transform',
      tooltip: 'Standardize CSV quote escaping',
      isPrimary: false,
      requiresValidPayload: true
    }
  ];

  private readonly curlOperations: OperationDefinition[] = [
    {
      id: 'extractBody',
      label: 'Extract Request Body (JSON)',
      icon: 'file-json',
      category: 'transform',
      tooltip: 'Extract HTTP POST/PUT payload from cURL command',
      isPrimary: true,
      requiresValidPayload: false
    },
    {
      id: 'extractHeaders',
      label: 'Extract Headers (JSON)',
      icon: 'list',
      category: 'transform',
      tooltip: 'Extract HTTP Headers as JSON Object',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'extractUrl',
      label: 'Extract URL & Query Params',
      icon: 'link',
      category: 'transform',
      tooltip: 'Extract request URL and query string parameters',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'extractAuth',
      label: 'Extract Authentication',
      icon: 'shield',
      category: 'transform',
      tooltip: 'Extract Bearer tokens, Basic Auth, and API keys',
      isPrimary: false,
      requiresValidPayload: false
    },
    {
      id: 'securityScan',
      label: 'Security Audit Scan',
      icon: 'shield-alert',
      category: 'transform',
      tooltip: 'Audit cURL command for exposed bearer tokens and secret keys',
      isPrimary: false,
      requiresValidPayload: false
    }
  ];

  getOperationsForFormat(formatId: string): OperationDefinition[] {
    if (formatId === 'json') {
      return this.jsonOperations;
    }
    if (formatId === 'yaml') {
      return this.yamlOperations;
    }
    if (formatId === 'xml') {
      return this.xmlOperations;
    }
    if (formatId === 'toml') {
      return this.tomlOperations;
    }
    if (formatId === 'csv') {
      return this.csvOperations;
    }
    if (formatId === 'curl') {
      return this.curlOperations;
    }
    return this.jsonOperations.filter(op => op.isPrimary);
  }

  getPrimaryOperations(formatId: string): OperationDefinition[] {
    return this.getOperationsForFormat(formatId).filter(op => op.isPrimary);
  }

  getSecondaryOperations(formatId: string): OperationDefinition[] {
    return this.getOperationsForFormat(formatId).filter(op => !op.isPrimary);
  }
}
