import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Home from './pages/Home';
import AddContent from './pages/AddContent';
import './App.css';

function App() {
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
  };

  return (
    <div className="app">
      <TopBar
        onSearch={handleSearch}
        onTypeFilter={handleTypeFilter}
        selectedType={selectedType}
      />
      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <Home
                searchQuery={searchQuery}
                selectedType={selectedType}
                onSearch={handleSearch}
              />
            }
          />
          <Route path="/add" element={<AddContent />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
