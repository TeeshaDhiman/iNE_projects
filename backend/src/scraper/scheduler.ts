import { supabase } from '../db';
import { scrapeProduct } from '../scraper/playwright';

/**
 * Scrapes ALL tracked products from the database.
 * This is called both by the cron schedule and the manual /api/scrape endpoint.
 * New products added to the DB are automatically included in the next run.
 */
export async function runScheduledScrape(): Promise<void> {
  console.log(`[Scraper] Starting scheduled scrape at ${new Date().toISOString()}`);

  const { data: products, error: fetchError } = await supabase.from('Product').select('*');
  if (fetchError) {
    console.error('[Scraper] Failed to fetch products:', fetchError.message);
    return;
  }
  if (!products || products.length === 0) {
    console.log('[Scraper] No products to scrape.');
    return;
  }

  console.log(`[Scraper] Found ${products.length} product(s) to scrape.`);

  for (const product of products) {
    console.log(`[Scraper] Scraping: ${product.name} (${product.url})`);
    const scrapeRes = await scrapeProduct(product.url, true); // headless

    // Always log the attempt — success OR failure
    await supabase.from('ScrapeLog').insert([{
      productId: product.id,
      status: scrapeRes.status,
      attemptNumber: scrapeRes.attempts,
      errorMessage: scrapeRes.error || null,
      timestamp: new Date().toISOString(),
    }]);

    if (scrapeRes.status !== 'FAILED' && scrapeRes.data) {
      // Save price snapshot to history
      await supabase.from('PriceHistory').insert([{
        productId: product.id,
        price: scrapeRes.data.price,
        stock: scrapeRes.data.stock,
        timestamp: new Date().toISOString(),
      }]);

      // Update latest price on the product itself
      await supabase
        .from('Product')
        .update({
          currentPrice: scrapeRes.data.price,
          currentStock: scrapeRes.data.stock,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', product.id);

      console.log(`[Scraper] ✅ ${product.name}: ₹${scrapeRes.data.price}, stock: ${scrapeRes.data.stock}`);
    } else {
      console.log(`[Scraper] ❌ ${product.name}: FAILED - ${scrapeRes.error}`);
    }
  }

  console.log(`[Scraper] Scheduled scrape completed at ${new Date().toISOString()}`);
}
