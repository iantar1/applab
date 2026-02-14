#!/usr/bin/env node

/**
 * Local Appointment Reminder Scheduler
 * 
 * Runs the appointment reminder check every 5 minutes locally
 * Use this during development to test reminders without deploying to Vercel
 * 
 * Usage:
 *   node scripts/scheduler.js
 * 
 * Or add to package.json and run:
 *   pnpm scheduler
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || '';
const INTERVAL_MINUTES = parseInt(process.env.SCHEDULER_INTERVAL || '5', 10);

console.log(`
╔════════════════════════════════════════════════════════════╗
║     AppointLab Appointment Reminder Scheduler              ║
║     Local Development Mode                                 ║
╚════════════════════════════════════════════════════════════╝

📱 Running appointment reminders every ${INTERVAL_MINUTES} minutes
🌐 App URL: ${APP_URL}
🔐 Using ${SCHEDULER_SECRET ? 'secret key' : 'no authentication'}
⏰ Started at: ${new Date().toLocaleString()}

Press Ctrl+C to stop.
`);

/**
 * Call the reminder scheduler endpoint
 */
async function runScheduler() {
  const timestamp = new Date().toLocaleString();
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (SCHEDULER_SECRET) {
      headers['Authorization'] = `Bearer ${SCHEDULER_SECRET}`;
    }

    const response = await fetch(`${APP_URL}/api/scheduler/appointment-reminders`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`\n[${timestamp}] ✅ Scheduler ran successfully`);
      console.log(`   Message: ${data.message}`);
      if (data.reminders && data.reminders.length > 0) {
        console.log(`   Reminders sent:`);
        data.reminders.forEach((r, i) => {
          const status = r.success ? '✅' : '❌';
          console.log(`     ${i + 1}. ${status} ${r.type.toUpperCase()} - Appointment #${r.appointmentId}`);
        });
      }
    } else {
      console.log(`\n[${timestamp}] ⚠️  Error: ${data.error}`);
    }
  } catch (error) {
    console.log(`\n[${timestamp}] ❌ Failed to run scheduler`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`   Make sure the app is running on ${APP_URL}`);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  // Run immediately on start
  runScheduler();

  // Then run on interval
  const intervalMs = INTERVAL_MINUTES * 60 * 1000;
  setInterval(runScheduler, intervalMs);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n👋 Scheduler stopped at ${new Date().toLocaleString()}`);
  process.exit(0);
});

// Start the scheduler
startScheduler();
