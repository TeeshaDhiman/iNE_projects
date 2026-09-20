import { Router } from 'express';
import { supabase } from '../db';
import { searchStore } from '../scraper/playwright';
import { runScheduledScrape } from '../scraper/scheduler';

export const apiRouter = Router();

// 1. Search products (Uses Playwright to search mock store live)
apiRouter.get('/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json([]);
  try {
    const results = await searchStore(query);
    res.json(results);
  } catch (error) {
    console.error('Search error', error);
    res.status(500).json({ error: 'Failed to search the mock store' });
  }
});

// 2. Get tracked products
apiRouter.get('/products', async (req, res) => {
  const { data, error } = await supabase.from('Product').select('*').order('createdAt', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 3. Add a product to track
apiRouter.post('/products', async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });

  const { data, error } = await supabase
    .from('Product')
    .insert([{ name, url, updatedAt: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Product already tracked' });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// 4. Get price history for a product
apiRouter.get('/products/:id/history', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('PriceHistory')
    .select('*')
    .eq('productId', id)
    .order('timestamp', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 5. Get scrape logs for a product
apiRouter.get('/products/:id/logs', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('ScrapeLog')
    .select('*')
    .eq('productId', id)
    .order('timestamp', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// 6. Trigger scrape manually (secured by CRON_SECRET)
// Uses the same logic as the automatic 2-hour cron job.
apiRouter.post('/scrape', async (req, res) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET || 'mysecret123';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Respond immediately and run scrape in background
  res.json({ message: 'Scrape started for all tracked products. Check logs for results.' });

  try {
    await runScheduledScrape();
  } catch (err) {
    console.error('[API] Manual scrape failed:', err);
  }
});
