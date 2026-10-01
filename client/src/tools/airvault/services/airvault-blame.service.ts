import { Injectable } from '@angular/core';
import { LineBlameEntry } from './airvault-clipboard.service';

@Injectable({
  providedIn: 'root'
})
export class AirVaultBlameService {

  /**
   * Generates a stable UUID for a line.
   */
  generateLineId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'line_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  /**
   * Builds an initial blame map for a newly authored text block where every line
   * is attributed to the initial author.
   */
  buildInitialBlame(
    text: string,
    authorIdentityId: string,
    authorColor: string,
    authorName: string,
    baseSeqNo: number = Date.now()
  ): LineBlameEntry[] {
    const lines = text.split('\n');
    return lines.map((_, index) => ({
      lineId: this.generateLineId(),
      authorIdentityId,
      authorColor,
      authorName,
      lastEditedAt: baseSeqNo + index,
      seqNo: baseSeqNo + index
    }));
  }

  /**
   * Reconciles a previous blame map against newly edited text using an LCS-based
   * line diff algorithm.
   * - Lines with unchanged text preserve their existing lineId, author, timestamp, and seqNo.
   * - Inserted or modified lines receive a new lineId and are attributed to the current editor.
   * - Deleted lines are naturally discarded.
   *
   * @param prevText The previous text content
   * @param prevBlame The prior LineBlameEntry array (parallel to prevText.split('\n'))
   * @param nextText The new text content
   * @param editorIdentityId Identity ID of the editing device/user
   * @param editorColor Snapshot color of the editor
   * @param editorName Display name of the editor
   * @param baseSeqNo Logical timestamp sequence number for this edit
   */
  reconcile(
    prevText: string,
    prevBlame: LineBlameEntry[] = [],
    nextText: string,
    editorIdentityId: string,
    editorColor: string,
    editorName: string,
    baseSeqNo: number = Date.now()
  ): LineBlameEntry[] {
    const prevLines = prevText.split('\n');
    const nextLines = nextText.split('\n');

    // If previous blame map is missing or mismatched in length, synthesize fallback entries
    const normalizedPrevBlame: LineBlameEntry[] = prevLines.map((_, i) => {
      if (prevBlame[i]) return prevBlame[i];
      return {
        lineId: this.generateLineId(),
        authorIdentityId: editorIdentityId,
        authorColor: editorColor,
        authorName: editorName,
        lastEditedAt: baseSeqNo,
        seqNo: baseSeqNo
      };
    });

    const m = prevLines.length;
    const n = nextLines.length;

    // Fast path: exact same text
    if (prevText === nextText && prevBlame.length === n) {
      return [...prevBlame];
    }

    // Fast path: text is empty
    if (nextText === '') {
      return [{
        lineId: this.generateLineId(),
        authorIdentityId: editorIdentityId,
        authorColor: editorColor,
        authorName: editorName,
        lastEditedAt: baseSeqNo,
        seqNo: baseSeqNo
      }];
    }

    // LCS Matrix for line diff (capped to prevent performance degradation on huge files)
    const MAX_DIFF_LINES = 1500;
    if (m > MAX_DIFF_LINES || n > MAX_DIFF_LINES) {
      return this.buildInitialBlame(nextText, editorIdentityId, editorColor, editorName, baseSeqNo);
    }

    // dp[i][j] = length of LCS between prevLines[0..i-1] and nextLines[0..j-1]
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1) as unknown as number[]);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (prevLines[i - 1] === nextLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack from dp[m][n] to find matched lines
    // matchedInNext[j] = index in prevLines matched to nextLines[j]
    const matchedInNext = new Map<number, number>();
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      if (prevLines[i - 1] === nextLines[j - 1]) {
        matchedInNext.set(j - 1, i - 1);
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // Build the updated blame map aligned to nextLines
    const nextBlame: LineBlameEntry[] = [];
    for (let nextIdx = 0; nextIdx < n; nextIdx++) {
      if (matchedInNext.has(nextIdx)) {
        const prevIdx = matchedInNext.get(nextIdx)!;
        const existing = normalizedPrevBlame[prevIdx];
        // Preserve unchanged line's identity and authorship
        nextBlame.push({ ...existing });
      } else {
        // Inserted or modified line: assign new stable UUID and current editor attribution
        nextBlame.push({
          lineId: this.generateLineId(),
          authorIdentityId: editorIdentityId,
          authorColor: editorColor,
          authorName: editorName,
          lastEditedAt: baseSeqNo + nextIdx,
          seqNo: baseSeqNo + nextIdx
        });
      }
    }

    return nextBlame;
  }

  /**
   * Merges two blame maps for concurrent/synced items based on lineId.
   * For matching lineIds, higher seqNo wins for primary attribution, but both author
   * contributions are merged into `segments` so multi-peer contributions on the same line
   * are cleanly preserved in the single gutter row.
   */
  merge(localBlame: LineBlameEntry[] = [], remoteBlame: LineBlameEntry[] = []): LineBlameEntry[] {
    if (!localBlame || localBlame.length === 0) return remoteBlame || [];
    if (!remoteBlame || remoteBlame.length === 0) return localBlame;

    const remoteMap = new Map<string, LineBlameEntry>();
    for (const entry of remoteBlame) {
      if (entry && entry.lineId) {
        remoteMap.set(entry.lineId, entry);
      }
    }

    return localBlame.map(localEntry => {
      const remoteEntry = remoteMap.get(localEntry.lineId);
      if (!remoteEntry) return localEntry;

      // If both local and remote have different authors on the same lineId, build/merge segments
      let mergedSegments = this.combineSegments(localEntry, remoteEntry);

      // Higher seqNo wins for primary header/color
      if (remoteEntry.seqNo > localEntry.seqNo) {
        return {
          ...remoteEntry,
          segments: mergedSegments
        };
      } else if (remoteEntry.seqNo === localEntry.seqNo) {
        // Tie-break lexicographically on author identity
        const winner = (remoteEntry.authorIdentityId || '') > (localEntry.authorIdentityId || '')
          ? remoteEntry
          : localEntry;
        return {
          ...winner,
          segments: mergedSegments
        };
      }
      return {
        ...localEntry,
        segments: mergedSegments
      };
    });
  }

  /**
   * Combines author segments from two blame entries if they represent distinct contributors.
   */
  private combineSegments(a: LineBlameEntry, b: LineBlameEntry) {
    const rawSegments = [
      ...(a.segments || [{
        authorIdentityId: a.authorIdentityId,
        authorColor: a.authorColor,
        authorName: a.authorName,
        lastEditedAt: a.lastEditedAt
      }]),
      ...(b.segments || [{
        authorIdentityId: b.authorIdentityId,
        authorColor: b.authorColor,
        authorName: b.authorName,
        lastEditedAt: b.lastEditedAt
      }])
    ];

    // Deduplicate by authorIdentityId, retaining newest lastEditedAt
    const segmentMap = new Map<string, any>();
    for (const seg of rawSegments) {
      const cleanKey = (seg.authorIdentityId || seg.authorName || '').toLowerCase().replace(/^@/, '');
      if (!cleanKey) continue;
      const existing = segmentMap.get(cleanKey);
      if (!existing || (seg.lastEditedAt > existing.lastEditedAt)) {
        segmentMap.set(cleanKey, seg);
      }
    }

    const uniqueSegments = Array.from(segmentMap.values());
    if (uniqueSegments.length <= 1) {
      return undefined;
    }
    return uniqueSegments;
  }

  /**
   * Data Isolation & Security Filter:
   * Strips any lines and corresponding blame entries that were authored by
   * devices not directly paired or authorized on this device.
   */
  filterAuthorizedLines(
    text: string,
    blame: LineBlameEntry[] = [],
    curDevice: { id?: string; username?: string; name?: string },
    pairedDevices: Array<{ id?: string; username?: string; name?: string; status?: string; syncEnabled?: boolean }>
  ): { text: string; blame: LineBlameEntry[] } {
    if (!text) return { text: '', blame: [] };

    const lines = text.split('\n');
    const curId = (curDevice.id || '').toLowerCase().replace(/^@/, '');
    const curUser = (curDevice.username || '').toLowerCase().replace(/^@/, '');
    const curName = (curDevice.name || '').toLowerCase().replace(/^@/, '');

    const activePaired = (pairedDevices || []).filter(p => p.status !== 'revoked' && p.syncEnabled !== false);

    const isAuthorized = (entry?: LineBlameEntry): boolean => {
      if (!entry) return true;
      const authorId = (entry.authorIdentityId || '').toLowerCase().replace(/^@/, '');
      const authorName = (entry.authorName || '').toLowerCase().replace(/^@/, '');

      // Local viewing device
      if (
        (curId && (authorId === curId || authorName === curId)) ||
        (curUser && (authorId === curUser || authorName === curUser)) ||
        (curName && (authorId === curName || authorName === curName)) ||
        authorId === 'local' || authorName === 'local'
      ) {
        return true;
      }

      // Directly paired peer
      return activePaired.some(p => {
        const pId = (p.id || '').toLowerCase().replace(/^@/, '');
        const pUser = (p.username || '').toLowerCase().replace(/^@/, '');
        const pName = (p.name || '').toLowerCase().replace(/^@/, '');
        return (
          (pId && (authorId === pId || authorName === pId)) ||
          (pUser && (authorId === pUser || authorName === pUser)) ||
          (pName && (authorId === pName || authorName === pName))
        );
      });
    };

    const filteredLines: string[] = [];
    const filteredBlame: LineBlameEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const entry = blame[i];
      if (isAuthorized(entry)) {
        filteredLines.push(lines[i]);
        filteredBlame.push(entry || {
          lineId: this.generateLineId(),
          authorIdentityId: curUser || curId || 'local',
          authorColor: '#2096f3',
          authorName: curUser ? `@${curUser}` : 'Local',
          lastEditedAt: Date.now() + i,
          seqNo: Date.now() + i
        });
      }
    }

    return {
      text: filteredLines.join('\n'),
      blame: filteredBlame
    };
  }

  /**
   * Helper to check whether a blame entry belongs to a specific author/device
   */
  public isSameAuthor(entry: LineBlameEntry | undefined, authorId: string, authorName?: string): boolean {
    if (!entry) return false;
    const cleanAuthorId = (authorId || '').toLowerCase().replace(/^@/, '');
    const cleanAuthorName = (authorName || '').toLowerCase().replace(/^@/, '');
    const entryId = (entry.authorIdentityId || '').toLowerCase().replace(/^@/, '');
    const entryName = (entry.authorName || '').toLowerCase().replace(/^@/, '');

    return (
      (cleanAuthorId.length > 0 && (entryId === cleanAuthorId || entryName === cleanAuthorId)) ||
      (cleanAuthorName.length > 0 && (entryId === cleanAuthorName || entryName === cleanAuthorName))
    );
  }

  /**
   * Merges concurrent text streams and blame maps without erasing or overriding
   * lines authored by different devices.
   * 
   * When two or more devices contribute lines concurrently (e.g. Device 2 writes line 2,
   * while Device 3 writes on line 2):
   * - Common anchor lines are matched and preserved.
   * - Lines authored by other devices are preserved and never overwritten.
   * - New lines authored by the remote sender are appended/integrated cleanly.
   * - Consecutive lines by the same author retain blame for continuous gutter bars.
   */
  mergeConcurrentTextsAndBlame(
    localText: string,
    localBlame: LineBlameEntry[] = [],
    remoteText: string,
    remoteBlame: LineBlameEntry[] = [],
    senderId: string,
    senderAuthor: string,
    senderColor: string,
    allowAuthorDeletions: boolean = true
  ): { text: string; blame: LineBlameEntry[] } {
    if (!localText || !localText.trim()) {
      const rLines = (remoteText || '').split('\n');
      const normalizedRemote = (remoteBlame && remoteBlame.length === rLines.length)
        ? remoteBlame
        : this.buildInitialBlame(remoteText, senderId, senderColor, senderAuthor);
      return { text: remoteText, blame: normalizedRemote };
    }

    if (!remoteText || !remoteText.trim()) {
      // If the remote sender deleted all their text and allowAuthorDeletions is active,
      // filter out all lines authored by the sender from the local text
      if (allowAuthorDeletions) {
        const remainingLines: string[] = [];
        const remainingBlame: LineBlameEntry[] = [];
        const lLines = localText.split('\n');
        lLines.forEach((l, idx) => {
          const b = localBlame[idx];
          if (!this.isSameAuthor(b, senderId, senderAuthor)) {
            remainingLines.push(l);
            remainingBlame.push(b);
          }
        });
        return { text: remainingLines.join('\n'), blame: remainingBlame };
      }
      return { text: localText, blame: localBlame };
    }

    if (localText === remoteText) {
      return { text: localText, blame: this.merge(localBlame, remoteBlame) };
    }

    const localLines = localText.split('\n');
    const remoteLines = remoteText.split('\n');

    const m = localLines.length;
    const n = remoteLines.length;

    const baseTimestamp = Date.now();

    // Normalize local blame map to match local lines length
    const normalizedLocalBlame: LineBlameEntry[] = localLines.map((_, i) => {
      if (localBlame[i]) return localBlame[i];
      return {
        lineId: this.generateLineId(),
        authorIdentityId: 'local',
        authorColor: '#2096f3',
        authorName: 'Local',
        lastEditedAt: baseTimestamp + i,
        seqNo: baseTimestamp + i
      };
    });

    // Normalize remote blame map to match remote lines length
    const normalizedRemoteBlame: LineBlameEntry[] = remoteLines.map((_, j) => {
      if (remoteBlame[j]) return remoteBlame[j];
      return {
        lineId: this.generateLineId(),
        authorIdentityId: senderId,
        authorColor: senderColor,
        authorName: senderAuthor,
        lastEditedAt: baseTimestamp + j,
        seqNo: baseTimestamp + j
      };
    });

    // Compute LCS between localLines and remoteLines
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1) as unknown as number[]);

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const lineMatch = localLines[i - 1] === remoteLines[j - 1];
        const idMatch = !!(normalizedLocalBlame[i - 1]?.lineId && normalizedRemoteBlame[j - 1]?.lineId &&
          normalizedLocalBlame[i - 1].lineId === normalizedRemoteBlame[j - 1].lineId);

        if (lineMatch || idMatch) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to collect matched anchor pairs (i, j)
    const matches: Array<{ localIdx: number; remoteIdx: number }> = [];
    let i = m;
    let j = n;
    while (i > 0 && j > 0) {
      const lineMatch = localLines[i - 1] === remoteLines[j - 1];
      const idMatch = !!(normalizedLocalBlame[i - 1]?.lineId && normalizedRemoteBlame[j - 1]?.lineId &&
        normalizedLocalBlame[i - 1].lineId === normalizedRemoteBlame[j - 1].lineId);

      if (lineMatch || idMatch) {
        matches.push({ localIdx: i - 1, remoteIdx: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    matches.reverse();

    const resultLines: string[] = [];
    const resultBlame: LineBlameEntry[] = [];

    let lastLocal = 0;
    let lastRemote = 0;

    const pushChunk = (lStart: number, lEnd: number, rStart: number, rEnd: number) => {
      const localChunk: Array<{ text: string; blame: LineBlameEntry }> = [];
      for (let k = lStart; k < lEnd; k++) {
        localChunk.push({ text: localLines[k], blame: normalizedLocalBlame[k] });
      }

      const remoteChunk: Array<{ text: string; blame: LineBlameEntry }> = [];
      for (let k = rStart; k < rEnd; k++) {
        remoteChunk.push({ text: remoteLines[k], blame: normalizedRemoteBlame[k] });
      }

      // 1. Process local chunk: retain lines authored by other devices or local user.
      // If the line was authored by the sender and omitted in remoteChunk, discard it when allowAuthorDeletions is true.
      for (const item of localChunk) {
        const isFromSender = this.isSameAuthor(item.blame, senderId, senderAuthor);
        if (!isFromSender) {
          resultLines.push(item.text);
          resultBlame.push(item.blame);
        } else if (!allowAuthorDeletions && remoteChunk.length === 0) {
          resultLines.push(item.text);
          resultBlame.push(item.blame);
        }
      }

      // 2. Process remote chunk: include all incoming lines from sender
      for (const item of remoteChunk) {
        // Prevent duplicate consecutive lines if exact match was already added from local
        const lastIdx = resultLines.length - 1;
        const isDuplicate = lastIdx >= 0 &&
          resultLines[lastIdx] === item.text &&
          this.isSameAuthor(resultBlame[lastIdx], item.blame.authorIdentityId, item.blame.authorName);

        if (!isDuplicate) {
          resultLines.push(item.text);
          resultBlame.push(item.blame);
        }
      }
    };

    for (const match of matches) {
      pushChunk(lastLocal, match.localIdx, lastRemote, match.remoteIdx);

      // Add the matched anchor line
      const anchorText = remoteLines[match.remoteIdx];
      const localAnchorBlame = normalizedLocalBlame[match.localIdx];
      const remoteAnchorBlame = normalizedRemoteBlame[match.remoteIdx];
      const anchorBlame = (remoteAnchorBlame.seqNo >= localAnchorBlame.seqNo)
        ? remoteAnchorBlame
        : localAnchorBlame;

      resultLines.push(anchorText);
      resultBlame.push(anchorBlame);

      lastLocal = match.localIdx + 1;
      lastRemote = match.remoteIdx + 1;
    }

    // Process remaining tail chunks
    pushChunk(lastLocal, m, lastRemote, n);

    return {
      text: resultLines.join('\n'),
      blame: resultBlame
    };
  }

  /**
   * Re-aligns a blame map after line order changes.
   * Any lines whose lineId exists retain their attribution; missing ones get synthesized.
   */
  reorder(blameMap: LineBlameEntry[], orderedLineIds: string[], fallbackAuthor: { id: string; color: string; name: string }): LineBlameEntry[] {
    const map = new Map<string, LineBlameEntry>();
    for (const b of blameMap) {
      if (b.lineId) map.set(b.lineId, b);
    }

    return orderedLineIds.map((lineId, idx) => {
      const existing = map.get(lineId);
      if (existing) return existing;
      return {
        lineId: lineId || this.generateLineId(),
        authorIdentityId: fallbackAuthor.id,
        authorColor: fallbackAuthor.color,
        authorName: fallbackAuthor.name,
        lastEditedAt: Date.now() + idx,
        seqNo: Date.now() + idx
      };
    });
  }
}
