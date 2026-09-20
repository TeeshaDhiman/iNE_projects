import React from 'react';

export interface Product {
  id: string;
  name: string;
  url: string;
}

interface ProductDashboardProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

// Deterministic color for avatar based on product name
function getAvatarColor(name: string): string {
  const colors = ['#f6f6f6', '#f0f0f0', '#ebebeb', '#f3f3f3', '#ededed'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const ProductDashboard: React.FC<ProductDashboardProps> = ({ products, onSelectProduct }) => {
  if (products.length === 0) {
    return (
      <div className="empty-state animate-in animate-in-delay-2">
        <div className="empty-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <p className="empty-title">No products tracked yet</p>
        <p className="empty-text">
          Search the catalog above and click <strong>Track</strong> to start monitoring prices.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in animate-in-delay-2">
      <div className="section-header">
        <span className="section-title">Tracked Products</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {products.length} {products.length === 1 ? 'product' : 'products'} monitored
        </span>
      </div>

      <div className="products-grid">
        {products.map((p, idx) => (
          <div
            key={p.id}
            id={`product-card-${p.id}`}
            className="product-card animate-in"
            style={{ animationDelay: `${idx * 0.06}s` }}
            onClick={() => onSelectProduct(p)}
          >
            <div className="product-card-header">
              <div
                className="product-avatar"
                style={{ background: getAvatarColor(p.name), color: '#767676', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'Georgia, serif' }}
              >
                {getInitials(p.name)}
              </div>
              <div className="product-card-info">
                <div className="product-title">{p.name}</div>
                <div className="product-url">{p.url.replace('https://demo.inelabteamdev.com', '')}</div>
              </div>
            </div>

            <div className="product-card-footer">
              <div className="tracking-indicator">
                <span className="tracking-dot" />
                Active
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                View history
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
