import type { RAGSearchResponse } from '../types/content.types';
import './SearchAnswer.css';

interface SearchAnswerProps {
  searchResponse: RAGSearchResponse;
  onSourceClick?: (sourceId: number) => void;
}

const SearchAnswer = ({ searchResponse, onSourceClick }: SearchAnswerProps) => {
  const { query, answer, sourceCount, sources } = searchResponse;

  return (
    <div className="search-answer-container">
      <div className="search-query-display">
        <span className="query-icon">🔍</span>
        <h2>"{query}"</h2>
      </div>

      <div className="ai-answer-section">
        <div className="ai-badge">
          <span className="ai-icon">✨</span>
          <span>AI-Generated Answer</span>
        </div>
        <div className="answer-content">
          <p>{answer}</p>
        </div>
      </div>

      {sourceCount > 0 && (
        <div className="sources-section">
          <h3 className="sources-header">
            <span className="sources-icon">📚</span>
            Sources ({sourceCount})
          </h3>
          <div className="sources-list">
            {sources.map((source) => (
              <div
                key={source.id}
                className="source-item"
                onClick={() => onSourceClick?.(source.id)}
                style={{ cursor: onSourceClick ? 'pointer' : 'default' }}
              >
                <div className="source-header">
                  <span className="source-type-badge">{source.type}</span>
                  <span className="source-score">
                    {(source.score * 100).toFixed(0)}% match
                  </span>
                </div>

                {source.imageUrl && (
                  <div className="source-media-container">
                    {source.type === 'video' ? (
                      <video
                        src={source.imageUrl.startsWith('http')
                          ? source.imageUrl
                          : `http://localhost:3000${source.imageUrl}`}
                        className="source-video"
                        controls
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <img
                        src={source.imageUrl.startsWith('http')
                          ? source.imageUrl
                          : `http://localhost:3000${source.imageUrl}`}
                        alt={source.title}
                        className="source-image"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                )}

                <h4 className="source-title">{source.title}</h4>

                {source.description && (
                  <p className="source-description">{source.description}</p>
                )}

                {source.url && (
                  <a
                    href={source.url}
                    className="source-url"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {source.url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchAnswer;
