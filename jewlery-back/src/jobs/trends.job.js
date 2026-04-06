// jobs/trends.job.js
import cron from 'node-cron';
import { trendsService } from '../modules/trends/trends.service.js';

export function startTrendsJob() {
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Atualizando tendências...');
    await trendsService.updateTrends();
  });
}