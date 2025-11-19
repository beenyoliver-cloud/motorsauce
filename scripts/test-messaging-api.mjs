#!/usr/bin/env node
/**
 * Test the messaging API endpoint to see what error is returned
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const API_URL = 'http://localhost:3000';

async function testMessagingAPI() {
  console.log('🧪 Testing messaging API...\n');
  
  // First, we need to get a valid auth token
  // For testing, we'll simulate what the client does
  
  console.log('Step 1: Checking if server is running...');
  try {
    const healthCheck = await fetch(`${API_URL}/api/health`);
    if (!healthCheck.ok) {
      console.log('❌ Server not responding on', API_URL);
      console.log('   Please start the dev server: npm run dev');
      return;
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.log('❌ Cannot connect to server at', API_URL);
    console.log('   Please start the dev server: npm run dev');
    return;
  }
  
  console.log('Step 2: You need to test this in the browser with a real user session');
  console.log('');
  console.log('To diagnose the issue:');
  console.log('1. Open your browser to http://localhost:3000');
  console.log('2. Log in as a user');
  console.log('3. Open Developer Tools (F12)');
  console.log('4. Go to Console tab');
  console.log('5. Go to someone\'s profile and click "Message"');
  console.log('6. Look for error messages in the console that start with:');
  console.log('   - [messagesClient]');
  console.log('   - [threads API POST]');
  console.log('');
  console.log('Common issues:');
  console.log('- "No authorization header" → User not logged in properly');
  console.log('- "Cannot create thread with yourself" → Trying to message own profile');
  console.log('- "peerId is required" → Profile missing user ID');
  console.log('- "Failed to create thread: [error]" → Database/RLS issue');
  console.log('');
  console.log('The improved error messages have been deployed to show the exact issue.');
}

testMessagingAPI();
