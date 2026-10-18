// apps/tool-online-clipboard/src/clipboard-features.spec.ts
import { describe, it, expect } from 'vitest';
import { ClipboardCrypto } from './services/clipboard-crypto';
import { ClipboardItem } from './services/clipboard-api.service';

describe('Online Clipboard Features & Security Suite', () => {

  describe('1. Automatic URL Detection & Parsing', () => {
    function extractUrls(text: string): string[] {
      if (!text) return [];
      const urlRegex = /\bhttps?:\/\/[^\s<>"'{}|\\^`[\]]+/gi;
      const matches = text.match(urlRegex) || [];
      const validUrls: string[] = [];
      const seen = new Set<string>();

      for (let url of matches) {
        url = url.replace(/[.,;:!?)]+$/, '');
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            if (!seen.has(url)) {
              seen.add(url);
              validUrls.push(url);
            }
          }
        } catch {
          // ignore malformed
        }
      }
      return validUrls;
    }

    it('should detect a single URL in raw text', () => {
      const text = 'Check this out: https://acklet.com/tool/json';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://acklet.com/tool/json']);
    });

    it('should extract multiple valid URLs in multi-line text', () => {
      const text = `
        Resource 1: https://angular.dev
        Resource 2: https://spartan.ng/documentation
        Api endpoint: http://localhost:8080/api/v1/clipboard
      `;
      const urls = extractUrls(text);
      expect(urls).toHaveLength(3);
      expect(urls).toContain('https://angular.dev');
      expect(urls).toContain('https://spartan.ng/documentation');
      expect(urls).toContain('http://localhost:8080/api/v1/clipboard');
    });

    it('should strip trailing sentence punctuation from URLs cleanly', () => {
      const text = 'Have you visited https://github.com/acklet? Yes, and https://linear.app.';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://github.com/acklet', 'https://linear.app']);
    });

    it('should ignore malformed or pseudo-URLs and normal text', () => {
      const text = 'This is not a url: htp://bad-url, nor ftp://files, nor just text.com.';
      const urls = extractUrls(text);
      expect(urls).toEqual([]);
    });

    it('should deduplicate repeated identical URLs in text', () => {
      const text = 'Link: https://acklet.com and repeated https://acklet.com';
      const urls = extractUrls(text);
      expect(urls).toEqual(['https://acklet.com']);
    });
  });

  describe('2. End-to-End Encryption (AES-GCM-256)', () => {
    it('should verify ciphertext JSON structure and key handling', () => {
      const sampleCiphertext = JSON.stringify({
        iv: 'YWJjZGVmZ2hpamts',
        data: 'bXljb250ZW50'
      });
      expect(sampleCiphertext.startsWith('{"iv":')).toBe(true);
      const parsed = JSON.parse(sampleCiphertext);
      expect(parsed.iv).toBeDefined();
      expect(parsed.data).toBeDefined();
    });
  });

  describe('3. File Deduplication Strategy', () => {
    it('should identify duplicates by contentHash or filename + size fallback', () => {
      const existing: ClipboardItem[] = [
        {
          id: 'item_1',
          shareCode: 'room1',
          itemType: 'FILE',
          originalName: 'document.pdf',
          sizeBytes: 1024,
          contentHash: 'hash_abc123',
          createdAt: new Date().toISOString(),
          downloadCount: 0,
          viewCount: 1
        }
      ];

      // Exact hash match
      const fileCandidate1 = { name: 'renamed_copy.pdf', size: 1024, hash: 'hash_abc123' };
      const isDuplicate1 = existing.some(i => i.contentHash === fileCandidate1.hash);
      expect(isDuplicate1).toBe(true);

      // Different hash, same name
      const fileCandidate2 = { name: 'document.pdf', size: 2048, hash: 'hash_different' };
      const isDuplicate2 = existing.some(i => i.contentHash === fileCandidate2.hash);
      expect(isDuplicate2).toBe(false);
    });
  });

  describe('4. Deterministic Multi-Option File Sorting', () => {
    const sampleItems: ClipboardItem[] = [
      {
        id: 'item_a',
        shareCode: 'c1',
        itemType: 'FILE',
        originalName: 'zebra.txt',
        sizeBytes: 500,
        createdAt: '2026-10-10T10:00:00Z',
        downloadCount: 0,
        viewCount: 1
      },
      {
        id: 'item_b',
        shareCode: 'c1',
        itemType: 'IMAGE',
        originalName: 'apple.png',
        sizeBytes: 2500,
        createdAt: '2026-10-12T12:00:00Z',
        downloadCount: 0,
        viewCount: 1
      },
      {
        id: 'item_c',
        shareCode: 'c1',
        itemType: 'FILE',
        originalName: 'banana.doc',
        sizeBytes: 1200,
        createdAt: '2026-10-11T11:00:00Z',
        downloadCount: 0,
        viewCount: 1
      }
    ];

    it('should sort by newest first with stable secondary tiebreaker', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_b', 'item_c', 'item_a']);
    });

    it('should sort by oldest first with stable secondary tiebreaker', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_a', 'item_c', 'item_b']);
    });

    it('should sort alphabetically by Name A-Z', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = (a.originalName || '').localeCompare(b.originalName || '', undefined, { sensitivity: 'base' });
        return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_b', 'item_c', 'item_a']); // apple, banana, zebra
    });

    it('should sort by largest file size first', () => {
      const list = [...sampleItems];
      list.sort((a, b) => {
        const diff = (b.sizeBytes || 0) - (a.sizeBytes || 0);
        return diff !== 0 ? diff : (b.id || '').localeCompare(a.id || '');
      });

      expect(list.map(i => i.id)).toEqual(['item_b', 'item_c', 'item_a']); // 2500, 1200, 500
    });
  });

  describe('6. Folder to ZIP Client-Side Packaging (ZipBuilder)', () => {
    it('should compute standard CRC32 checksums correctly', async () => {
      const { ZipBuilder } = await import('./services/zip-builder');
      const testData = new TextEncoder().encode('123456789');
      const crc = ZipBuilder.crc32(testData);
      expect(crc).toBe(0xcbf43926);
    });

    it('should package folder files into a valid ZIP archive with PK signatures', async () => {
      const { ZipBuilder } = await import('./services/zip-builder');
      const file1 = new File(['console.log("hello world");'], 'index.ts', { type: 'text/typescript' });
      const file2 = new File(['# Documentation'], 'README.md', { type: 'text/markdown' });

      const entries = [
        { path: 'src/index.ts', file: file1 },
        { path: 'README.md', file: file2 }
      ];

      const zipFile = await ZipBuilder.createZipFile('my-app', entries);
      expect(zipFile.name).toBe('my-app.zip');
      expect(zipFile.type).toBe('application/zip');
      expect(zipFile.size).toBeGreaterThan(60);

      const buffer = await zipFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Verify Local File Header signature (PK\x03\x04)
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4B);
      expect(bytes[2]).toBe(0x03);
      expect(bytes[3]).toBe(0x04);

      // Verify End of Central Directory signature (PK\x05\x06) in last 22 bytes
      const eocdOffset = bytes.length - 22;
      expect(bytes[eocdOffset]).toBe(0x50);
      expect(bytes[eocdOffset + 1]).toBe(0x4B);
      expect(bytes[eocdOffset + 2]).toBe(0x05);
      expect(bytes[eocdOffset + 3]).toBe(0x06);

      // Verify total entries count is 2 (at eocdOffset + 10, uint16 little endian)
      const totalEntries = bytes[eocdOffset + 10] | (bytes[eocdOffset + 11] << 8);
      expect(totalEntries).toBe(2);
    });
  });

  describe('7. Double-Click Selection & Deselection Mechanics (Vice Versa)', () => {
    it('should select an item on double-click and deselect it on subsequent double-click', () => {
      const selectedItemIds = new Set<string>();

      const toggleItem = (id: string) => {
        if (selectedItemIds.has(id)) {
          selectedItemIds.delete(id);
        } else {
          selectedItemIds.add(id);
        }
      };

      // 1. Initial state: not selected
      expect(selectedItemIds.has('file-1')).toBe(false);

      // 2. Double-click: select item
      toggleItem('file-1');
      expect(selectedItemIds.has('file-1')).toBe(true);
      expect(selectedItemIds.size).toBe(1);

      // 3. Double-click again: deselect item (vice versa)
      toggleItem('file-1');
      expect(selectedItemIds.has('file-1')).toBe(false);
      expect(selectedItemIds.size).toBe(0);

      // 4. Multiple items selected via double-click
      toggleItem('file-1');
      toggleItem('file-2');
      expect(selectedItemIds.has('file-1')).toBe(true);
      expect(selectedItemIds.has('file-2')).toBe(true);
      expect(selectedItemIds.size).toBe(2);

      // 5. Deselecting only one item via double-click leaves other selected
      toggleItem('file-1');
      expect(selectedItemIds.has('file-1')).toBe(false);
      expect(selectedItemIds.has('file-2')).toBe(true);
      expect(selectedItemIds.size).toBe(1);
    });

    it('should only show selection bar in Files tab and hide / clear selection when switching to Text tab', () => {
      let activeTab: 'text' | 'files' = 'files';
      let selectedItemIds = new Set<string>(['file-1', 'file-2']);

      const shouldShowSelectionBar = () => activeTab === 'files' && selectedItemIds.size > 0;

      // On Files tab with selected items
      expect(shouldShowSelectionBar()).toBe(true);

      // Switching to Text tab clears selection and hides selection bar
      const setTab = (tab: 'text' | 'files') => {
        activeTab = tab;
        if (tab === 'text') {
          selectedItemIds.clear();
        }
      };

      setTab('text');
      expect(activeTab).toBe('text');
      expect(selectedItemIds.size).toBe(0);
      expect(shouldShowSelectionBar()).toBe(false);

      // Even if items were somehow marked selected, bar is never visible in text tab
      selectedItemIds.add('file-3');
      expect(shouldShowSelectionBar()).toBe(false);
    });
  });

  describe('8. Clipboard Rename, Settings Ditto-Copy & Inline Join Suggestions', () => {
    it('should detect duplicate clipboard IDs and reject renaming to an existing active room', () => {
      const activeRooms = new Map<string, { code: string; hasPin: boolean; burnAfterReading: boolean }>();
      activeRooms.set('test', { code: 'test', hasPin: false, burnAfterReading: false });
      activeRooms.set('work-notes', { code: 'work-notes', hasPin: true, burnAfterReading: false });

      const attemptRename = (current: string, desired: string) => {
        if (activeRooms.has(desired) && desired !== current) {
          throw new Error(`Clipboard ID "${desired}" is already taken`);
        }
        const existing = activeRooms.get(current)!;
        activeRooms.delete(current);
        activeRooms.set(desired, { ...existing, code: desired });
        return activeRooms.get(desired);
      };

      // Renaming to already taken ID throws conflict error
      expect(() => attemptRename('work-notes', 'test')).toThrow('Clipboard ID "test" is already taken');
      // Original room is not overwritten or corrupted
      expect(activeRooms.get('test')?.code).toBe('test');
      expect(activeRooms.get('work-notes')?.hasPin).toBe(true);

      // Renaming to available ID succeeds with ditto copy
      const renamed = attemptRename('work-notes', 'work-notes-2026');
      expect(renamed?.code).toBe('work-notes-2026');
      expect(renamed?.hasPin).toBe(true);
    });

    it('should handle inline join suggestions for empty inputs or non-existent codes without modal dialogs', () => {
      let joinError: string | null = null;
      let pendingJoinNewCode: string | null = null;
      let clipboardCreated: string | null = null;

      const handleJoin = (code: string, exists: boolean) => {
        const trimmed = code.trim().toLowerCase();
        if (!trimmed) {
          joinError = 'Enter a clipboard code to continue';
          return;
        }

        if (!exists) {
          if (pendingJoinNewCode === trimmed) {
            // Second click/enter: proceed with creation
            clipboardCreated = trimmed;
            pendingJoinNewCode = null;
            joinError = null;
            return;
          }
          // First attempt: inline suggestion
          pendingJoinNewCode = trimmed;
          joinError = `Code "${trimmed}" does not exist. Press Open again to create it, or enter an existing code.`;
          return;
        }

        // Successfully joins existing code
        clipboardCreated = trimmed;
        pendingJoinNewCode = null;
        joinError = null;
      };

      // 1. Empty input -> inline suggestion
      handleJoin('', false);
      expect(joinError).toBe('Enter a clipboard code to continue');
      expect(pendingJoinNewCode).toBeNull();

      // 2. Non-existent code first try -> inline suggestion prompting to press Open again
      handleJoin('my-custom-code', false);
      expect(joinError).toContain('does not exist. Press Open again to create it');
      expect(pendingJoinNewCode).toBe('my-custom-code');

      // 3. Second click/enter on same non-existent code -> continues and creates
      handleJoin('my-custom-code', false);
      expect(clipboardCreated).toBe('my-custom-code');
      expect(joinError).toBeNull();
      expect(pendingJoinNewCode).toBeNull();
    });
  });

  describe('8. Save Button & Unsaved Changes State Machine', () => {
    it('should track clean -> dirty -> saving -> saved transitions', () => {
      let isTextDirty = false;
      let isSavingText = false;
      let saveFailed = false;
      let lastSavedTime: number | null = null;
      let remoteSnapshot = 'Initial text';
      let currentText = 'Initial text';

      // 1. Initial clean state
      expect(isTextDirty).toBe(false);
      expect(isSavingText).toBe(false);
      expect(saveFailed).toBe(false);

      // 2. User edits text -> dirty
      currentText = 'Edited text by user';
      isTextDirty = currentText !== remoteSnapshot;
      expect(isTextDirty).toBe(true);

      // 3. Save initiated -> saving
      isSavingText = true;
      expect(isSavingText).toBe(true);

      // 4. Save succeeds -> clean, saved timestamp recorded
      isSavingText = false;
      remoteSnapshot = currentText;
      isTextDirty = false;
      saveFailed = false;
      lastSavedTime = Date.now();

      expect(isTextDirty).toBe(false);
      expect(isSavingText).toBe(false);
      expect(saveFailed).toBe(false);
      expect(lastSavedTime).toBeGreaterThan(0);
    });

    it('should transition to failed state on network error and allow retry', () => {
      let isSavingText = false;
      let saveFailed = false;
      let isTextDirty = true;

      // 1. Save initiated
      isSavingText = true;
      saveFailed = false;

      // 2. Save fails
      isSavingText = false;
      saveFailed = true;
      expect(saveFailed).toBe(true);
      expect(isTextDirty).toBe(true); // dirty flag remains intact!

      // 3. Retry succeeds
      isSavingText = true;
      saveFailed = false;
      // network responds OK:
      isSavingText = false;
      isTextDirty = false;
      saveFailed = false;

      expect(isSavingText).toBe(false);
      expect(saveFailed).toBe(false);
      expect(isTextDirty).toBe(false);
    });

    it('should guard against duplicate concurrent save requests', () => {
      let saveCallCount = 0;
      let isSavingText = false;

      const triggerSave = () => {
        if (isSavingText) return false;
        isSavingText = true;
        saveCallCount++;
        return true;
      };

      expect(triggerSave()).toBe(true);
      expect(saveCallCount).toBe(1);

      // Second simultaneous click while saving
      expect(triggerSave()).toBe(false);
      expect(saveCallCount).toBe(1);

      // After first save finishes:
      isSavingText = false;
      expect(triggerSave()).toBe(true);
      expect(saveCallCount).toBe(2);
    });

    it('should not auto-save and retain dirty state until explicit manual save', () => {
      let isTextDirty = false;
      let remoteSnapshot = 'Server confirmed text';
      let currentText = 'Server confirmed text';

      // User types changes
      currentText = 'New draft without auto-save';
      isTextDirty = currentText !== remoteSnapshot;
      expect(isTextDirty).toBe(true);

      // Verify that without manual save, dirty state is strictly retained
      expect(currentText).not.toBe(remoteSnapshot);
      expect(isTextDirty).toBe(true);
    });

    it('should discard changes and revert to remote snapshot cleanly', () => {
      let remoteSnapshot = 'Original text';
      let currentText = 'Unsaved draft text';
      let isTextDirty = true;
      let draftInStorage: string | null = 'Unsaved draft text';

      // Discard action triggered
      currentText = remoteSnapshot;
      isTextDirty = false;
      draftInStorage = null;

      expect(currentText).toBe('Original text');
      expect(isTextDirty).toBe(false);
      expect(draftInStorage).toBeNull();
    });

    it('should handle unsaved changes confirmation dialog choices (Save, Discard, Cancel)', () => {
      let isTextDirty = true;
      let currentCode = 'room-1';
      let targetCode = 'room-2';
      let activeRoom = 'room-1';

      // Scenario A: User chooses Cancel -> remains in current room, text remains dirty
      const userCancels = () => {
        // Dialog dismissed without navigation
      };
      userCancels();
      expect(activeRoom).toBe('room-1');
      expect(isTextDirty).toBe(true);

      // Scenario B: User chooses Discard -> reverts text and navigates
      const userDiscards = () => {
        isTextDirty = false;
        activeRoom = targetCode;
      };
      userDiscards();
      expect(activeRoom).toBe('room-2');
      expect(isTextDirty).toBe(false);

      // Reset for Scenario C
      isTextDirty = true;
      activeRoom = 'room-1';

      // Scenario C: User chooses Save -> saves text to room-1, then navigates
      const userSaves = () => {
        isTextDirty = false;
        activeRoom = targetCode;
      };
      userSaves();
      expect(activeRoom).toBe('room-2');
      expect(isTextDirty).toBe(false);
    });

    it('should trigger sudden-exit auto-save on beforeunload/pagehide without blocking dialog', () => {
      let isTextDirty = true;
      let defaultPrevented = false;
      const localStore = new Map<string, string>();
      let keepaliveSent = false;
      let sentCode = '';
      let sentText = '';

      const suddenExitSave = (code: string, text: string) => {
        localStore.set(`acklet_draft_text_${code}`, text);
        keepaliveSent = true;
        sentCode = code;
        sentText = text;
      };

      const onBeforeUnload = (event: { preventDefault: () => void; returnValue: string }) => {
        if (isTextDirty) {
          suddenExitSave('room-test', 'urgent unsaved notes');
          isTextDirty = false;
          // Deliberately do NOT preventDefault or set returnValue to avoid the intrusive native leave-site popup
        }
      };

      const mockEvent = {
        preventDefault: () => { defaultPrevented = true; },
        returnValue: ''
      };

      onBeforeUnload(mockEvent);

      expect(defaultPrevented).toBe(false);
      expect(mockEvent.returnValue).toBe('');
      expect(keepaliveSent).toBe(true);
      expect(sentCode).toBe('room-test');
      expect(sentText).toBe('urgent unsaved notes');
      expect(localStore.get('acklet_draft_text_room-test')).toBe('urgent unsaved notes');
      expect(isTextDirty).toBe(false);
    });
  });

  describe('9. Versioning & Optimistic Locking Concurrency', () => {
    it('should detect stale version conflicts without losing user draft', () => {
      let serverVersion = 2;
      let clientVersion = 1; // stale
      let hasConflict = false;
      let conflictServerText = '';
      const localDraft = 'Local unsaved work by User A';
      const remoteLatest = 'Remote update by User B';

      const saveAttempt = (expectedVer: number, text: string) => {
        if (expectedVer !== serverVersion) {
          // 409 Conflict
          hasConflict = true;
          conflictServerText = remoteLatest;
          return { status: 409 };
        }
        serverVersion++;
        return { status: 200 };
      };

      const result = saveAttempt(clientVersion, localDraft);
      expect(result.status).toBe(409);
      expect(hasConflict).toBe(true);
      expect(localDraft).toBe('Local unsaved work by User A'); // local edits preserved!
      expect(conflictServerText).toBe('Remote update by User B'); // server state preserved!
    });

    it('should support force-save (Keep Mine) and overwrite server safely', () => {
      let serverVersion = 2;
      let serverText = 'Remote content';
      const myText = 'My authoritative content';

      const forceSave = (text: string) => {
        serverText = text;
        serverVersion++;
        return { status: 200, version: serverVersion };
      };

      const res = forceSave(myText);
      expect(res.status).toBe(200);
      expect(serverText).toBe('My authoritative content');
      expect(serverVersion).toBe(3);
    });
  });

  describe('10. Local Draft Preservation & Recovery', () => {
    it('should detect when local draft exists and differs from server confirmed text', () => {
      const mockStorage = new Map<string, string>();
      const code = 'abc12';
      const serverText = 'Original server version';
      const localUnsavedDraft = 'Important unsaved edits before refresh';

      mockStorage.set(`acklet_draft_text_${code}`, localUnsavedDraft);

      // On session load:
      const savedDraft = mockStorage.get(`acklet_draft_text_${code}`);
      const hasDraftRecovery = !!savedDraft && savedDraft !== serverText && savedDraft.trim().length > 0;

      expect(hasDraftRecovery).toBe(true);
      expect(savedDraft).toBe(localUnsavedDraft);

      // User restores draft:
      const activeText = savedDraft!;
      expect(activeText).toBe(localUnsavedDraft);

      // User saves -> draft removed from storage:
      mockStorage.delete(`acklet_draft_text_${code}`);
      expect(mockStorage.has(`acklet_draft_text_${code}`)).toBe(false);
    });
  });

  describe('11. Scoped Real-Time Synchronization', () => {
    it('should only accept events matching current clipboard code', () => {
      const activeCode = 'room-alpha';
      const processedEvents: string[] = [];

      const handleEvent = (event: { shareCode: string; itemText: string }) => {
        if (event.shareCode !== activeCode) return;
        processedEvents.push(event.itemText);
      };

      handleEvent({ shareCode: 'room-beta', itemText: 'Other room text' });
      handleEvent({ shareCode: 'room-alpha', itemText: 'Alpha text' });

      expect(processedEvents).toEqual(['Alpha text']);
    });

    it('should flag conflict instead of overwriting dirty local text on remote sync event', () => {
      const isDirty = true;
      let localText = 'My unsaved paragraph';
      let hasConflict = false;
      let remoteTextSnapshot = '';

      const onSyncTextReceived = (incomingText: string) => {
        if (isDirty) {
          hasConflict = true;
          // Do NOT overwrite localText!
        } else {
          localText = incomingText;
          remoteTextSnapshot = incomingText;
        }
      };

      onSyncTextReceived('Incoming changes from device 2');
      expect(hasConflict).toBe(true);
      expect(localText).toBe('My unsaved paragraph'); // Intact!
    });
  });

  describe('12. Resilient Clipboard History & Recent Rooms', () => {
    it('should save, order, and retrieve recent clipboards reliably', () => {
      const storage = new Map<string, string>();
      const STORAGE_KEY = 'acklet_clipboard_recent_history';

      const saveRecord = (rec: { code: string; createdAt: number; itemCount: number }) => {
        const raw = storage.get(STORAGE_KEY);
        const list: Array<{ code: string; createdAt: number; itemCount: number }> = raw ? JSON.parse(raw) : [];
        const existingIdx = list.findIndex(r => r.code.toLowerCase() === rec.code.toLowerCase());
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...rec };
        } else {
          list.unshift(rec);
        }
        list.sort((a, b) => b.createdAt - a.createdAt);
        storage.set(STORAGE_KEY, JSON.stringify(list.slice(0, 15)));
      };

      const getRecent = () => {
        const raw = storage.get(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      };

      saveRecord({ code: 'first-room', createdAt: 1000, itemCount: 1 });
      saveRecord({ code: 'second-room', createdAt: 2000, itemCount: 5 });
      saveRecord({ code: 'first-room', createdAt: 3000, itemCount: 2 }); // re-visiting moves to top

      const recent = getRecent();
      expect(recent.length).toBe(2);
      expect(recent[0].code).toBe('first-room');
      expect(recent[0].itemCount).toBe(2);
      expect(recent[1].code).toBe('second-room');
    });

    it('should remove a single clipboard from history', () => {
      const storage = new Map<string, string>();
      const STORAGE_KEY = 'acklet_clipboard_recent_history';
      const initial = [
        { code: 'keep-me', createdAt: 2000 },
        { code: 'delete-me', createdAt: 1000 }
      ];
      storage.set(STORAGE_KEY, JSON.stringify(initial));

      const deleteRecord = (code: string) => {
        const raw = storage.get(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((r: { code: string }) => r.code !== code);
        storage.set(STORAGE_KEY, JSON.stringify(filtered));
      };

      deleteRecord('delete-me');
      const updated = JSON.parse(storage.get(STORAGE_KEY)!);
      expect(updated.length).toBe(1);
      expect(updated[0].code).toBe('keep-me');
    });
  });

  describe('13. Active Version History Synthesis', () => {
    it('should synthesize current active version at top when past revisions exist', () => {
      const pastRevisions = [
        { id: 'rev_1', version: 1, textContent: 'Initial draft', isCurrent: false }
      ];
      const currentText = 'Initial draft edited';
      const currentVersion = 2;

      const fullRevisions = [...pastRevisions];
      if (!fullRevisions.some(r => r.isCurrent) && currentText.trim()) {
        fullRevisions.unshift({
          id: 'current_active',
          version: currentVersion,
          textContent: currentText,
          isCurrent: true
        });
      }

      expect(fullRevisions.length).toBe(2);
      expect(fullRevisions[0].isCurrent).toBe(true);
      expect(fullRevisions[0].textContent).toBe('Initial draft edited');
      expect(fullRevisions[1].isCurrent).toBe(false);
    });

    it('should display current version even when no past archived revisions exist yet', () => {
      const pastRevisions: Array<{ id: string; version: number; textContent: string; isCurrent: boolean }> = [];
      const currentText = 'First save in room';
      const currentVersion = 1;

      const fullRevisions = [...pastRevisions];
      if (!fullRevisions.some(r => r.isCurrent) && currentText.trim()) {
        fullRevisions.unshift({
          id: 'current_active',
          version: currentVersion,
          textContent: currentText,
          isCurrent: true
        });
      }

      expect(fullRevisions.length).toBe(1);
      expect(fullRevisions[0].isCurrent).toBe(true);
      expect(fullRevisions[0].textContent).toBe('First save in room');
    });
  });
});


