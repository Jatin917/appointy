import type { ContentItem, SearchResult } from '../types/content.types';
import './ContentCard.css';

interface ContentCardProps {
  item: ContentItem | SearchResult;
}

const ContentCard = ({ item }: ContentCardProps) => {
  const isSearchResult = 'score' in item;
  const score = isSearchResult ? (item as SearchResult).score : undefined;

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      text: '📝',
      url: '🔗',
      image: '🖼️',
      video: '🎥',
      document: '📄',
    };
    return icons[type.toLowerCase()] || '📋';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: '#3b82f6',
      url: '#8b5cf6',
      image: '#ec4899',
      video: '#ef4444',
      document: '#10b981',
    };
    return colors[type.toLowerCase()] || '#6b7280';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string | null, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="content-card">
      <div className="card-header">
        <div className="card-type" style={{ backgroundColor: getTypeColor(item.type) }}>
          <span className="type-icon">{getTypeIcon(item.type)}</span>
          <span className="type-text">{item.type}</span>
        </div>
        {score !== undefined && (
          <div className="card-score">
            Score: {(score * 100).toFixed(1)}%
          </div>
        )}
      </div>

      {item.imageUrl && (
        <div className="card-image">
          <img
            src={item.imageUrl.startsWith('http') ? item.imageUrl : `http://localhost:3000${item.imageUrl}`}
            alt={item.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
            }}
          />
        </div>
      )}

      <div className="card-body">
        <h3 className="card-title">{item.title}</h3>

        {item.description && (
          <p className="card-description">{truncateText(item.description, 150)}</p>
        )}

        {item.content && !item.imageUrl && (
          <p className="card-content">{truncateText(item.content, 200)}</p>
        )}

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-url"
          >
            {item.url}
          </a>
        )}

        {item.labels && item.labels.length > 0 && (
          <div className="card-labels">
            {item.labels.map((label, index) => (
              <span key={index} className="label">
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="card-footer">
          <span className="card-date">
            Created: {formatDate(item.createdAt)}
          </span>
          <span className="card-id">ID: {item.id}</span>
        </div>
      </div>
    </div>
  );
};

export default ContentCard;
