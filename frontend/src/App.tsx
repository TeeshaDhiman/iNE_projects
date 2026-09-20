import { useState, useEffect } from 'react';
import axios from 'axios';
import { SearchStore } from './components/SearchStore';
import { ProductDashboard, Product } from './components/ProductDashboard';
import { ProductDetails } from './components/ProductDetails';

const API_BASE = 'http://localhost:3000/api';

function App() {
  const [trackedProducts, setTrackedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchTrackedProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/products`);
      setTrackedProducts(res.data);
    } catch (e) {
      console.error('Failed to fetch products', e);
    }
  };

  useEffect(() => {
    fetchTrackedProducts();
  }, []);

  return (
    <div className="app-wrapper">
      {/* Sticky Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand" onClick={() => setSelectedProduct(null)}>
            <div className="brand-logo">P</div>
            <span className="brand-name">Price<span>Watch</span></span>
          </div>
          <div className="navbar-meta">
            <span className="nav-badge">Live Monitoring</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="app-container">
        {selectedProduct ? (
          <ProductDetails product={selectedProduct} onBack={() => setSelectedProduct(null)} />
        ) : (
          <>
            {/* Page Header */}
            <div className="page-header animate-in">
              <h1 className="page-title">Product Intelligence</h1>
              <p className="page-subtitle">
                Search, track, and monitor real-time pricing across the INE store catalog.
              </p>
            </div>

            <SearchStore onProductAdded={fetchTrackedProducts} />
            <ProductDashboard products={trackedProducts} onSelectProduct={setSelectedProduct} />
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="app-footer">
        PriceWatch &copy; {new Date().getFullYear()} &mdash; Enterprise Product Intelligence Platform
      </footer>
    </div>
  );
}

export default App;
