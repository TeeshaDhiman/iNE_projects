import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { apiRouter } from './routes/api';
import { runScheduledScrape } from './scraper/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.FRONTEND_URL || '',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

app.use('/api', apiRouter);

// Basic healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('[Info] Setting up internal cron job (every 2 hours)...');
  
  // Run every 30 minutes (change to '0 */2 * * *' for production 2-hour interval)
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] Triggering scheduled scrape...');
    await runScheduledScrape();
  });

  // Immediately run an initial scrape of all tracked products (after 5 seconds)
  setTimeout(async () => {
    console.log('[Startup] Triggering initial scrape...');
    await runScheduledScrape();
  }, 5000);
});
