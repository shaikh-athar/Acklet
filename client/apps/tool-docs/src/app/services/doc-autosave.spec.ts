// client/apps/tool-docs/src/app/services/doc-autosave.spec.ts

import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { DocService } from './doc.service';
import { DocSection, DocDocumentDetail } from '../models/doc.model';

describe('DocService — Autosave State Transitions & Section Reordering', () => {
  let docService: DocService;
  let mockHttp: any;

  const mockDoc: DocDocumentDetail = {
    id: 'doc-123',
    toolId: 'tool-456',
    toolName: 'JSON Formatter',
    title: 'Initial Title',
    status: 'DRAFT',
    ownerId: 'user-789',
    sections: [
      { id: 'sec-1', documentId: 'doc-123', heading: 'Section 1', body: 'Body 1', position: 0, createdAt: '', updatedAt: '' },
      { id: 'sec-2', documentId: 'doc-123', heading: 'Section 2', body: 'Body 2', position: 1, createdAt: '', updatedAt: '' },
      { id: 'sec-3', documentId: 'doc-123', heading: 'Section 3', body: 'Body 3', position: 2, createdAt: '', updatedAt: '' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: mockHttp }]
    });

    runInInjectionContext(injector, () => {
      docService = new DocService();
    });

    docService.currentDocument.set(JSON.parse(JSON.stringify(mockDoc)));
  });

  describe('Autosave State Transitions', () => {
    it('starts with idle status and no unsaved changes', () => {
      expect(docService.autosaveStatus()).toBe('idle');
      expect(docService.hasUnsavedChanges()).toBe(false);
    });

    it('transitions to dirty when content changes', () => {
      docService.markDirty();
      expect(docService.hasUnsavedChanges()).toBe(true);
    });

    it('transitions from idle -> saving -> saved on successful update', () => {
      const updatedDoc: DocDocumentDetail = {
        ...mockDoc,
        title: 'Updated Title',
        updatedAt: new Date().toISOString()
      };

      mockHttp.put.mockReturnValue(of({ success: true, data: updatedDoc }));

      docService.markDirty();
      expect(docService.hasUnsavedChanges()).toBe(true);

      docService.updateDocument('doc-123', { title: 'Updated Title' }).subscribe(res => {
        expect(res.title).toBe('Updated Title');
      });

      expect(docService.autosaveStatus()).toBe('saved');
      expect(docService.lastSavedAt()).toBeInstanceOf(Date);
      expect(docService.hasUnsavedChanges()).toBe(false);
      expect(docService.currentDocument()?.title).toBe('Updated Title');
    });

    it('transitions from saving -> error on network failure and retains unsaved state', () => {
      mockHttp.put.mockReturnValue(throwError(() => new Error('Network failure: 500')));

      docService.markDirty();
      expect(docService.hasUnsavedChanges()).toBe(true);

      docService.updateDocument('doc-123', { title: 'Updated Title' }).subscribe({
        next: () => {},
        error: () => {}
      });

      expect(docService.autosaveStatus()).toBe('error');
      // Unsaved changes remain true so the user does not lose edits and retry is available
      expect(docService.hasUnsavedChanges()).toBe(true);
    });
  });

  describe('Section Reordering & Mutation', () => {
    it('reorders sections atomically and updates document state', () => {
      const reorderedSections: DocSection[] = [
        { id: 'sec-3', documentId: 'doc-123', heading: 'Section 3', body: 'Body 3', position: 0, createdAt: '', updatedAt: '' },
        { id: 'sec-1', documentId: 'doc-123', heading: 'Section 1', body: 'Body 1', position: 1, createdAt: '', updatedAt: '' },
        { id: 'sec-2', documentId: 'doc-123', heading: 'Section 2', body: 'Body 2', position: 2, createdAt: '', updatedAt: '' }
      ];

      mockHttp.put.mockReturnValue(of({ success: true, data: reorderedSections }));

      docService.reorderSections('doc-123', ['sec-3', 'sec-1', 'sec-2']).subscribe(res => {
        expect(res).toEqual(reorderedSections);
      });

      expect(docService.autosaveStatus()).toBe('saved');
      const updatedDoc = docService.currentDocument();
      expect(updatedDoc?.sections[0].id).toBe('sec-3');
      expect(updatedDoc?.sections[0].position).toBe(0);
      expect(updatedDoc?.sections[1].id).toBe('sec-1');
      expect(updatedDoc?.sections[2].id).toBe('sec-2');
    });

    it('deleting a section re-sequences remaining positions to 0..N-1', () => {
      mockHttp.delete.mockReturnValue(of({ success: true }));

      // Delete sec-2 (originally at position 1)
      docService.deleteSection('doc-123', 'sec-2').subscribe();

      const remaining = docService.currentDocument()?.sections;
      expect(remaining?.length).toBe(2);
      expect(remaining?.[0].id).toBe('sec-1');
      expect(remaining?.[0].position).toBe(0);
      expect(remaining?.[1].id).toBe('sec-3');
      expect(remaining?.[1].position).toBe(1); // Position re-sequenced to 1
    });

    it('creating a section appends it and updates the document section list', () => {
      const newSec: DocSection = {
        id: 'sec-4',
        documentId: 'doc-123',
        heading: 'Section 4',
        body: 'Body 4',
        position: 3,
        createdAt: '',
        updatedAt: ''
      };

      mockHttp.post.mockReturnValue(of({ success: true, data: newSec }));

      docService.createSection('doc-123', { heading: 'Section 4' }).subscribe(created => {
        expect(created.id).toBe('sec-4');
      });

      const updated = docService.currentDocument()?.sections;
      expect(updated?.length).toBe(4);
      expect(updated?.[3].id).toBe('sec-4');
      expect(updated?.[3].position).toBe(3);
    });
  });

  describe('Publishing & Public Operations', () => {
    it('publishes document, updates status to PUBLISHED, sets slug and publishedAt', () => {
      const publishedDoc: DocDocumentDetail = {
        ...mockDoc,
        status: 'PUBLISHED',
        slug: 'initial-title',
        summary: 'A short summary',
        publishedAt: new Date().toISOString()
      };

      mockHttp.post.mockReturnValue(of({ success: true, data: publishedDoc }));

      docService.markDirty();
      expect(docService.hasUnsavedChanges()).toBe(true);

      docService.publishDocument('doc-123', { title: 'Initial Title', summary: 'A short summary' }).subscribe(res => {
        expect(res.status).toBe('PUBLISHED');
        expect(res.slug).toBe('initial-title');
      });

      expect(docService.autosaveStatus()).toBe('saved');
      expect(docService.hasUnsavedChanges()).toBe(false);
      expect(docService.currentDocument()?.status).toBe('PUBLISHED');
      expect(docService.currentDocument()?.slug).toBe('initial-title');
    });

    it('unpublishes document and resets status to DRAFT while retaining slug', () => {
      const unpublishedDoc: DocDocumentDetail = {
        ...mockDoc,
        status: 'DRAFT',
        slug: 'initial-title',
        summary: 'A short summary'
      };

      mockHttp.post.mockReturnValue(of({ success: true, data: unpublishedDoc }));

      docService.unpublishDocument('doc-123').subscribe(res => {
        expect(res.status).toBe('DRAFT');
        expect(res.slug).toBe('initial-title');
      });

      expect(docService.currentDocument()?.status).toBe('DRAFT');
      expect(docService.currentDocument()?.slug).toBe('initial-title');
    });

    it('fetches public document successfully without authentication using global slug', () => {
      const publicDoc = {
        title: 'Public Guide',
        summary: 'Public summary',
        toolName: 'JSON Formatter',
        toolSlug: 'json-formatter',
        slug: 'public-guide',
        publishedAt: new Date().toISOString(),
        sections: [
          { heading: 'Public Section', body: 'Content', position: 0 }
        ]
      };

      mockHttp.get.mockReturnValue(of({ success: true, data: publicDoc }));

      docService.getPublicDocument('public-guide').subscribe(res => {
        expect(res.title).toBe('Public Guide');
        expect(res.slug).toBe('public-guide');
        expect(res.sections.length).toBe(1);
      });

      expect(mockHttp.get).toHaveBeenCalledWith('/api/v1/docs/public/public-guide');
    });
  });

  describe('Phase 3 Dashboard Management & Pagination', () => {
    it('fetches documents with search, status, and sort params, updating docPage signal', () => {
      const pageResult = {
        content: [
          {
            id: 'doc-search-1',
            toolId: 'tool-456',
            title: 'Search Match Title',
            status: 'PUBLISHED' as const,
            ownerId: 'user-789',
            sectionCount: 2,
            createdAt: '',
            updatedAt: ''
          }
        ],
        totalElements: 1,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false
      };

      mockHttp.get.mockReturnValue(of({ success: true, data: pageResult }));

      docService.fetchDocuments({
        toolId: 'tool-456',
        q: 'search match',
        status: 'PUBLISHED',
        sort: 'title_asc',
        page: 0,
        size: 10
      }).subscribe(res => {
        expect(res.totalElements).toBe(1);
        expect(res.content[0].title).toBe('Search Match Title');
      });

      expect(docService.documents().length).toBe(1);
      expect(docService.docPage()?.totalElements).toBe(1);
      expect(docService.loading()).toBe(false);
    });

    it('duplicates document and prepends copy to documents list', () => {
      const duplicatedDetail: DocDocumentDetail = {
        id: 'doc-dup-999',
        toolId: 'tool-456',
        title: 'Copy of Initial Title',
        status: 'DRAFT',
        ownerId: 'user-789',
        sections: [
          { id: 'sec-dup-1', documentId: 'doc-dup-999', heading: 'Section 1', body: 'Body 1', position: 0, createdAt: '', updatedAt: '' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockHttp.post.mockReturnValue(of({ success: true, data: duplicatedDetail }));

      docService.duplicateDocument('doc-123').subscribe(res => {
        expect(res.id).toBe('doc-dup-999');
        expect(res.title).toBe('Copy of Initial Title');
        expect(res.status).toBe('DRAFT');
      });

      expect(mockHttp.post).toHaveBeenCalledWith('/api/v1/docs/doc-123/duplicate', {});
      expect(docService.documents()[0].id).toBe('doc-dup-999');
      expect(docService.documents()[0].title).toBe('Copy of Initial Title');
    });

    it('deletes document and removes it from documents list and decrements totalElements', () => {
      docService.documents.set([
        { id: 'doc-to-delete', toolId: 'tool-456', title: 'Delete Me', status: 'DRAFT', ownerId: 'user-789', sectionCount: 1, createdAt: '', updatedAt: '' },
        { id: 'doc-keep', toolId: 'tool-456', title: 'Keep Me', status: 'DRAFT', ownerId: 'user-789', sectionCount: 1, createdAt: '', updatedAt: '' }
      ]);
      docService.docPage.set({
        content: docService.documents(),
        totalElements: 2,
        totalPages: 1,
        size: 10,
        number: 0,
        first: true,
        last: true,
        empty: false
      });

      mockHttp.delete.mockReturnValue(of({ success: true }));

      docService.deleteDocument('doc-to-delete').subscribe();

      expect(mockHttp.delete).toHaveBeenCalledWith('/api/v1/docs/doc-to-delete');
      expect(docService.documents().length).toBe(1);
      expect(docService.documents()[0].id).toBe('doc-keep');
      expect(docService.docPage()?.totalElements).toBe(1);
    });
  });
});
