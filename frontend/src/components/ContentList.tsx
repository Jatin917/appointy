import type { ContentItem, SearchResult } from '../types/content.types';
import ContentCard from './ContentCard';
import './ContentList.css';

interface ContentListProps {
  items: (ContentItem | SearchResult)[];
  loading: boolean;
  error: string | null;
  isSearchMode: boolean;
}

const ContentList = ({ items, loading, error, isSearchMode }: ContentListProps) => {
  if (loading) {
    return (
      <div className="content-list-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-list-container">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Error Loading Content</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="content-list-container">
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No Content Found</h3>
          <p>
            {isSearchMode
              ? 'Try adjusting your search query or filters'
              : 'No content items available. Create some content to get started.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-list-container">
      <div className="content-list-header">
        <h2>
          {isSearchMode ? 'Search Results' : 'All Content'}
          <span className="item-count">({items.length} items)</span>
        </h2>
      </div>

      <div className="content-grid">
        {items.map((item) => (
          <ContentCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

export default ContentList;
