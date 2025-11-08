import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './TopBar.css';

interface TopBarProps {
  onSearch: (query: string) => void;
  onTypeFilter: (type: string) => void;
  selectedType: string;
}

const TopBar = ({ onSearch, onTypeFilter, selectedType }: TopBarProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  const contentTypes = ['all', 'text', 'url', 'image', 'video', 'document'];

  return (
    <div className="topbar">
      <div className="topbar-container">
        <div className="topbar-left">
          <Link to="/" className="topbar-title-link">
            <h1 className="topbar-title">Content Library</h1>
          </Link>
        </div>

        <div className="topbar-center">
          <form onSubmit={handleSubmit} className="search-form">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content..."
              className="search-input"
            />
            <button type="submit" className="search-button">
              Search
            </button>
            {searchQuery && (
              <button type="button" onClick={handleClear} className="clear-button">
                Clear
              </button>
            )}
          </form>
        </div>

        <div className="topbar-right">
          <div className="type-filter">
            <label htmlFor="type-select">Type: </label>
            <select
              id="type-select"
              value={selectedType}
              onChange={(e) => onTypeFilter(e.target.value)}
              className="type-select"
            >
              {contentTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => navigate('/add')}
            className="add-content-button"
          >
            <span className="add-icon">+</span>
            Add Content
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
