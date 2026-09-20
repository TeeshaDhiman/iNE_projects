import { scrapeProduct } from '../scraper/playwright';
import { prisma } from '../db';
import dotenv from 'dotenv';

dotenv.config();

async function runHeaded() {
  console.log('Starting Headed Scrape Demonstration...');
  const isHeaded = process.env.HEADED === 'true';
  
  if (!isHeaded) {
    console.log('Running in headless mode. Set HEADED=true for headed mode.');
  }

  const products = await prisma.product.findMany();
  
  if (products.length === 0) {
    console.log('No tracked products found. Add a product first via the API or Frontend.');
    return;
  }

  for (const product of products) {
    console.log(`\nScraping: ${product.name} (${product.url})`);
    console.log('--------------------------------------------------');
    const result = await scrapeProduct(product.url, !isHeaded);
    console.log('Scrape Result:', JSON.stringify(result, null, 2));

    if (result.status !== 'FAILED' && result.data) {
      console.log('Success! Simulated saving to DB (Not actually saving in script to avoid duplicate cron data).');
    } else {
      console.log('Failed to scrape properly. Logged error.');
    }
  }

  console.log('\nDemonstration complete.');
  process.exit(0);
}

runHeaded();
