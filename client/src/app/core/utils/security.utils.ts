/**
 * Utility to identify and filter sensitive files, directories, or patterns
 * to prevent security breaches and accidental leakage of system files/credentials.
 */
export class SecurityUtils {
  // Common directory names to ignore during scans
  private static readonly SENSITIVE_DIRECTORIES = new Set([
    '.git',
    '.github',
    '.agents',
    '.gemini',
    'node_modules',
    '.gradle',
    '.idea',
    '.vscode',
    'build',
    'dist',
    'target',
    'bin',
    'out'
  ]);

  // Exact file names to ignore during scans
  private static readonly SENSITIVE_FILE_NAMES = new Set([
    '.gitignore',
    '.gitattributes',
    '.gitmodules',
    '.ds_store',
    'thumbs.db',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    'credentials.json',
    'secrets.json',
    'secrets.yaml',
    'secrets.yml'
  ]);

  // File extension patterns to ignore during scans
  private static readonly SENSITIVE_EXTENSIONS = [
    '.pem',
    '.key',
    '.p12',
    '.pfx',
    '.jks',
    '.db',
    '.sqlite',
    '.config' // Web.config etc.
  ];

  /**
   * Checks if a given filename or path is sensitive and should be ignored/filtered out.
   */
  static isSensitive(pathOrName: string): boolean {
    if (!pathOrName) return false;

    // Normalize path separators to forward slash and convert to lowercase
    const normalized = pathOrName.replace(/\\/g, '/').toLowerCase();
    
    // Extract filename and path segments
    const segments = normalized.split('/');
    const fileName = segments[segments.length - 1];

    // 1. Check if any directory segment is sensitive
    for (let i = 0; i < segments.length - 1; i++) {
      if (this.SENSITIVE_DIRECTORIES.has(segments[i])) {
        return true;
      }
    }

    // 2. Check if the file name itself is a sensitive directory name (e.g. if checking a directory path)
    if (this.SENSITIVE_DIRECTORIES.has(fileName)) {
      return true;
    }

    // 3. Check if the file name matches a sensitive file name exactly
    if (this.SENSITIVE_FILE_NAMES.has(fileName)) {
      return true;
    }

    // 4. Check for sensitive extensions
    if (this.SENSITIVE_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
      return true;
    }

    // 5. Check if it starts with standard hidden patterns typically associated with system config
    if (fileName.startsWith('.') && fileName !== '.' && fileName !== '..') {
      return true;
    }

    return false;
  }

  /**
   * Filters an array of objects to remove any sensitive items.
   */
  static filterSensitiveObjects<T>(items: T[], getPath: (item: T) => string): T[] {
    return items.filter(item => !this.isSensitive(getPath(item)));
  }

  /**
   * Filters an array of string paths to remove any sensitive items.
   */
  static filterPaths(paths: string[]): string[] {
    return paths.filter(path => !this.isSensitive(path));
  }
}
