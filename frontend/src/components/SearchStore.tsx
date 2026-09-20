import React, { useState } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

interface SearchStoreProps {
  onProductAdded: () => void;
}

export const SearchStore: React.FC<SearchStoreProps> = ({ onProductAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{name: string, url: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setSearchResults([]);
    try {
      const res = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
      if (res.data.length === 0) {
        setError(`No products found matching "${searchQuery}".`);
      }
    } catch (e) {
      setError('Unable to reach the backend. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const trackProduct = async (product: {name: string, url: string}) => {
    try {
      await axios.post(`${API_BASE}/products`, product);
      onProductAdded();
      setSearchResults([]);
      setSearchQuery('');
    } catch (e: any) {
      if (e.response?.status === 400) {
        setError('This product is already being tracked.');
      } else {
        setError('Failed to add product to tracking list.');
      }
    }
  };

  return (
    <div className="search-section animate-in animate-in-delay-1">
      {/* Search label */}
      <span className="search-label">Search Store Catalog</span>

      {/* Search Row */}
      <div className="search-row" style={{ marginBottom: error ? '1rem' : searchResults.length > 0 ? '1rem' : '0' }}>
        <div className="search-input-wrapper">
          <span className="search-icon-left">
            {loading ? (
              <span className="spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            )}
          </span>
          <input
            id="product-search-input"
            type="text"
            className="search-input"
            placeholder="Search by name, category, brand… e.g. 'Headphones', 'Keyboard'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            disabled={loading}
          />
        </div>
        <button
          id="search-btn"
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={loading || !searchQuery.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Searching…
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Search
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error animate-in">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="results-section">
          <div className="results-header">
            <span className="results-title">Results</span>
            <span className="results-count">{searchResults.length} found</span>
          </div>
          <div className="results-grid">
            {searchResults.map((item, idx) => (
              <div key={idx} className="result-item animate-in" style={{ animationDelay: `${idx * 0.04}s` }}>
                <div className="result-item-left">
                  <div className="result-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  </div>
                  <div>
                    <div className="result-name">{item.name}</div>
                    <div className="result-url">{item.url}</div>
                  </div>
                </div>
                <button
                  id={`track-btn-${idx}`}
                  className="btn btn-primary btn-sm"
                  onClick={() => trackProduct(item)}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Track
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
