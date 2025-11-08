import { useState, useEffect } from 'react';
import ContentList from '../components/ContentList';
import SearchAnswer from '../components/SearchAnswer';
import contentApi from '../services/api.service';
import type { ContentItem, SearchResult, RAGSearchResponse } from '../types/content.types';

interface HomeProps {
  searchQuery: string;
  selectedType: string;
  onSearch: (query: string) => void;
}

const Home = ({ searchQuery, selectedType, onSearch }: HomeProps) => {
  const [items, setItems] = useState<(ContentItem | SearchResult)[]>([]);
  const [searchResponse, setSearchResponse] = useState<RAGSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Load all content on initial mount and when type filter changes
  useEffect(() => {
    if (!isSearchMode) {
      loadContent();
    }
  }, [selectedType, isSearchMode]);

  // Handle search when searchQuery prop changes
  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      setIsSearchMode(false);
      setSearchResponse(null);
    }
  }, [searchQuery, selectedType]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters = selectedType !== 'all' ? { type: selectedType } : {};
      const data = await contentApi.getContent(filters);
      setItems(data);
    } catch (err) {
      console.error('Error loading content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setIsSearchMode(false);
      setSearchResponse(null);
      return;
    }

    setIsSearchMode(true);
    setLoading(true);
    setError(null);
    setSearchResponse(null);

    try {
      const filters = selectedType !== 'all' ? { type: selectedType } : {};
      const response = await contentApi.ragSearch(query, filters);
      setSearchResponse(response);
    } catch (err) {
      console.error('Error searching content:', err);
      setError(err instanceof Error ? err.message : 'Failed to search content');
      setSearchResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceClick = async (sourceId: number) => {
    try {
      const item = await contentApi.getContentById(sourceId);
      console.log('Clicked source:', item);
    } catch (err) {
      console.error('Error fetching source details:', err);
    }
  };

  return (
    <>
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {error && !loading && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && isSearchMode && searchResponse && (
        <SearchAnswer
          searchResponse={searchResponse}
          onSourceClick={handleSourceClick}
        />
      )}

      {!loading && !error && !isSearchMode && (
        <ContentList
          items={items}
          loading={false}
          error={null}
          isSearchMode={false}
        />
      )}
    </>
  );
};

export default Home;
