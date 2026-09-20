import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Product } from './ProductDashboard';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api';

interface ProductDetailsProps {
  product: Product;
  onBack: () => void;
}

interface PriceHistory {
  id: string;
  price: number;
  stock: number;
  timestamp: string;
}

interface ScrapeLog {
  id: string;
  timestamp: string;
  attemptNumber: number;
  status: string;
  errorMessage: string | null;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onBack }) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [histRes, logsRes] = await Promise.all([
        axios.get(`${API_BASE}/products/${product.id}/history`),
        axios.get(`${API_BASE}/products/${product.id}/logs`)
      ]);
      setHistory(histRes.data);
      setLogs(logsRes.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to fetch details', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchData(false);

    // Auto-refresh every 60 seconds silently (no spinner flicker)
    const intervalId = setInterval(() => {
      fetchData(true);
    }, 60_000);

    return () => clearInterval(intervalId);
  }, [product.id]);


  const latestPrice = history.length > 0 ? history[history.length - 1].price : null;
  const latestStock = history.length > 0 ? history[history.length - 1].stock : null;
  const successCount = logs.filter(l => l.status.includes('SUCCESS')).length;
  const successRate = logs.length > 0 ? Math.round((successCount / logs.length) * 100) : null;

  const chartData = {
    labels: history.map(h => formatDate(h.timestamp)),
    datasets: [
      {
        label: 'Price',
        data: history.map(h => h.price),
        borderColor: '#111',
        backgroundColor: 'rgba(17, 17, 17, 0.06)',
        pointBackgroundColor: '#111',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Stock',
        data: history.map(h => h.stock),
        borderColor: '#767676',
        backgroundColor: 'rgba(118, 118, 118, 0.06)',
        pointBackgroundColor: '#767676',
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        labels: {
          color: '#767676',
          font: { size: 12, family: 'Inter, sans-serif' },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: '#fff',
        borderColor: '#e4e4e4',
        borderWidth: 1,
        titleColor: '#111',
        bodyColor: '#767676',
        padding: 12,
        titleFont: { family: 'Georgia, serif', weight: 'bold' as const },
        bodyFont: { family: 'Inter, sans-serif' },
      }
    },
    scales: {
      x: {
        ticks: { color: '#767676', font: { size: 11, family: 'Inter, sans-serif' } },
        grid: { color: '#f0f0f0' },
        border: { color: '#e4e4e4' },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: { color: '#111', font: { size: 11, family: 'Georgia, serif' }, callback: (v: any) => `₹${v}` },
        grid: { color: '#f0f0f0' },
        border: { color: '#e4e4e4' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: { color: '#767676', font: { size: 11 } },
        grid: { drawOnChartArea: false },
        border: { color: '#e4e4e4' },
      },
    },
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '3rem' }}>
        <div className="loading-card animate-in">
          <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
          <span className="loading-text">Loading product data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in">
      {/* Back Button */}
      <button className="details-back-btn" id="back-btn" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Dashboard
      </button>

      {/* Hero Card */}
      <div className="details-hero">
        <div className="details-hero-header">
          <div>
            <h2 className="details-title">{product.name}</h2>
            <p className="details-url">{product.url}</p>
          </div>
          {latestPrice !== null && (
            <div className="stat-pill stat-pill-success">
              ₹{latestPrice.toFixed(0)}
            </div>
          )}
        </div>

        {/* Stats Row */}
        {history.length > 0 && (
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem', borderBottom: '1px solid var(--line)', paddingBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Current Price</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>₹{latestPrice?.toFixed(0)}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--line)' }} />
            <div>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: '0.25rem' }}>In Stock</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{latestStock}</div>
            </div>
            <div style={{ width: '1px', background: 'var(--line)' }} />
            <div>
              <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Data Points</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{history.length}</div>
            </div>
            {successRate !== null && (
              <>
                <div style={{ width: '1px', background: 'var(--line)' }} />
                <div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--muted)', marginBottom: '0.25rem' }}>Success Rate</div>
                  <div style={{ fontFamily: 'Georgia, serif', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>{successRate}%</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chart */}
        {history.length > 0 ? (
          <div className="chart-container">
            <div className="chart-title">Price & Stock History</div>
            <Line options={chartOptions} data={chartData} />
          </div>
        ) : (
          <div className="empty-state" style={{ border: '1px dashed var(--border-normal)', padding: '2.5rem' }}>
            <div className="empty-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <p className="empty-title">No price history yet</p>
            <p className="empty-text">The scheduled scraper hasn't collected data for this product. Data will appear here after the first successful run.</p>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="logs-card animate-in animate-in-delay-1">
        <div className="logs-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="logs-card-title">Scrape Activity Log</span>
            {logs.length > 0 && (
              <span className="badge badge-success">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                {logs.length} entries
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {lastUpdated && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              id="refresh-logs-btn"
              onClick={() => fetchData(true)}
              style={{
                background: 'rgba(0, 242, 254, 0.08)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                borderRadius: '8px',
                color: 'var(--accent-cyan)',
                padding: '4px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>


        {logs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="log-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Attempts</th>
                  <th>Status</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const isSuccess = log.status.includes('SUCCESS');
                  const isRetry = log.status === 'SUCCESS_AFTER_RETRY';
                  return (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                        {formatDate(log.timestamp)}
                      </td>
                      <td style={{ color: 'var(--text-primary)', textAlign: 'center', fontWeight: 600 }}>
                        {log.attemptNumber}
                      </td>
                      <td>
                        <span className={`badge ${isSuccess ? (isRetry ? 'badge-warning' : 'badge-success') : 'badge-error'}`}>
                          {isSuccess ? (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          )}
                          {log.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--danger)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                        {log.errorMessage || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2.5rem', textAlign: 'center' }}>
            <p className="empty-text">No scrape attempts have been recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
