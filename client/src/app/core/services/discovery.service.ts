import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DynamicHomepageSection } from '../models/discovery.model';
import { Tool } from '../models/tool.model';

@Injectable({
  providedIn: 'root'
})
export class DiscoveryService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/discovery';

  getHomepageSections(): Observable<DynamicHomepageSection[]> {
    return this.http.get<DynamicHomepageSection[]>(`${this.apiUrl}/homepage`).pipe(
      catchError(() => of(this.getFallbackHomepageSections()))
    );
  }

  searchTools(query?: string, category?: string, page = 0, size = 12): Observable<any> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    if (query) params = params.set('query', query);
    if (category) params = params.set('category', category);

    return this.http.get<any>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(() => of({ content: [], totalElements: 0 }))
    );
  }

  getAutocompleteSuggestions(query: string): Observable<string[]> {
    if (!query || query.trim().length < 2) return of([]);
    return this.http.get<string[]>(`${this.apiUrl}/search/autocomplete`, {
      params: new HttpParams().set('q', query)
    }).pipe(
      catchError(() => of([]))
    );
  }

  getToolRecommendations(toolId: string, type = 'ALTERNATIVE'): Observable<Tool[]> {
    return this.http.get<Tool[]>(`${this.apiUrl}/tools/${toolId}/recommendations`, {
      params: new HttpParams().set('type', type)
    }).pipe(
      catchError(() => of([]))
    );
  }

  private getFallbackHomepageSections(): DynamicHomepageSection[] {
    return [
      {
        sectionKey: 'FEATURED',
        title: 'Featured Tools',
        subtitle: 'Hand-picked premium developer & design utilities',
        displayOrder: 1,
        items: []
      },
      {
        sectionKey: 'TRENDING',
        title: 'Trending Now',
        subtitle: 'Tools with rapid community adoption',
        displayOrder: 2,
        items: []
      }
    ];
  }
}
