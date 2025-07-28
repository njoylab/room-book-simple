#!/usr/bin/env npx tsx

/**
 * @fileoverview Airtable webhook management script
 * @description Automatically creates, lists, and manages Airtable webhooks
 * for automatic cache invalidation when rooms or bookings are modified.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Get only the environment variables we need for webhooks
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_MEETING_ROOMS_TABLE = process.env.AIRTABLE_MEETING_ROOMS_TABLE || 'MeetingRooms';
const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.VERCEL_URL || 'https://your-domain.com';

// Validate only required variables
if (!AIRTABLE_API_KEY) {
  console.error('❌ AIRTABLE_API_KEY is required in .env file');
  process.exit(1);
}

if (!AIRTABLE_BASE_ID) {
  console.error('❌ AIRTABLE_BASE_ID is required in .env file');
  process.exit(1);
}

interface AirtableWebhook {
  id: string;
  macSecretBase64: string;
  notificationUrl: string;
  specification: {
    options: {
      filters: {
        dataTypes: string[];
        recordChangeScope?: string;
        fromSources?: string[];
      };
    };
  };
}

interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId: string;
}

/**
 * Makes authenticated requests to Airtable API
 */
async function airtableRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`https://api.airtable.com/v0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Gets all tables in the base to find table IDs
 */
async function getTables(): Promise<AirtableTable[]> {
  const response = await airtableRequest(`/meta/bases/${AIRTABLE_BASE_ID}/tables`);
  return response.tables;
}

/**
 * Lists existing webhooks for the base
 */
async function listWebhooks(): Promise<AirtableWebhook[]> {
  const response = await airtableRequest(`/bases/${AIRTABLE_BASE_ID}/webhooks`);
  return response.webhooks || [];
}

/**
 * Creates a webhook for a specific table
 */
async function createWebhook(tableId: string, tableName: string): Promise<AirtableWebhook> {
  const webhookUrl = `${APP_BASE_URL}/api/webhooks/airtable`;

  const webhook = await airtableRequest(`/bases/${AIRTABLE_BASE_ID}/webhooks`, {
    method: 'POST',
    body: JSON.stringify({
      notificationUrl: webhookUrl,
      specification: {
        options: {
          filters: {
            dataTypes: ['tableData'],
            recordChangeScope: tableId,
            fromSources: ['client']
          }
        }
      }
    })
  });

  console.log(`✅ Created webhook for ${tableName} table (${tableId})`);
  console.log(`   Webhook ID: ${webhook.id}`);
  console.log(`   Secret: ${webhook.macSecretBase64}`);

  return webhook;
}

/**
 * Creates a single webhook that monitors multiple tables
 */
async function createCombinedWebhook(tableIds: string[], description: string): Promise<AirtableWebhook> {
  const webhookUrl = `${APP_BASE_URL}/api/webhooks/airtable`;

  const webhook = await airtableRequest(`/bases/${AIRTABLE_BASE_ID}/webhooks`, {
    method: 'POST',
    body: JSON.stringify({
      notificationUrl: webhookUrl,
      specification: {
        options: {
          filters: {
            dataTypes: ['tableData'],
            // Don't specify recordChangeScope to monitor all tables
            fromSources: ['client']
          }
        }
      }
    })
  });

  console.log(`✅ Created combined webhook for ${description}`);
  console.log(`   Webhook ID: ${webhook.id}`);
  console.log(`   Secret: ${webhook.macSecretBase64}`);
  console.log(`   Monitoring tables: ${tableIds.join(', ')}`);

  return webhook;
}

/**
 * Deletes a webhook by ID
 */
async function deleteWebhook(webhookId: string): Promise<void> {
  await airtableRequest(`/bases/${AIRTABLE_BASE_ID}/webhooks/${webhookId}`, {
    method: 'DELETE'
  });
  console.log(`🗑️  Deleted webhook ${webhookId}`);
}

/**
 * Main setup function
 */
async function setupWebhooks() {
  try {
    console.log('🚀 Setting up Airtable webhooks...\n');

    // Test basic API access first
    console.log('🔍 Testing API access...');
    try {
      // Test with a simple records request instead of base info
      const testResponse = await airtableRequest(`/${AIRTABLE_BASE_ID}/${AIRTABLE_MEETING_ROOMS_TABLE}?maxRecords=1`);
      console.log('✅ Basic API access works');
    } catch (error) {
      console.error('❌ Basic API access failed:', error.message);
      console.log('\n💡 This might mean:');
      console.log('   1. AIRTABLE_API_KEY is invalid');
      console.log('   2. AIRTABLE_BASE_ID is incorrect');
      console.log('   3. Meeting rooms table name is wrong');
      console.log(`   4. Current values: BASE_ID=${AIRTABLE_BASE_ID}, TABLE=${AIRTABLE_MEETING_ROOMS_TABLE}`);
      throw error;
    }

    // Test meta API access
    console.log('📋 Testing Meta API access...');
    let tables;
    try {
      tables = await getTables();
      console.log(`✅ Meta API access works - found ${tables.length} tables:\n`);

      tables.forEach(table => {
        console.log(`  - ${table.name} (${table.id})`);
      });
    } catch (error) {
      console.error('❌ Meta API access failed:', error.message);
      console.log('\n💡 This might mean:');
      console.log('   1. Your API token lacks schema.bases:read permission');
      console.log('   2. Your Airtable plan doesn\'t support Meta API');
      console.log('   3. The base ID is incorrect');
      throw error;
    }

    // Find our target tables
    const roomsTable = tables.find(t => t.name === AIRTABLE_MEETING_ROOMS_TABLE);
    const bookingsTable = tables.find(t => t.name === AIRTABLE_BOOKINGS_TABLE);

    if (!roomsTable) {
      throw new Error(`Meeting rooms table '${AIRTABLE_MEETING_ROOMS_TABLE}' not found`);
    }
    if (!bookingsTable) {
      throw new Error(`Bookings table '${AIRTABLE_BOOKINGS_TABLE}' not found`);
    }

    console.log(`\n✅ Found target tables:`);
    console.log(`   Meeting Rooms: ${roomsTable.name} (${roomsTable.id})`);
    console.log(`   Bookings: ${bookingsTable.name} (${bookingsTable.id})`);

    // Check existing webhooks
    console.log('\n🔍 Checking existing webhooks...');
    const existingWebhooks = await listWebhooks();

    if (existingWebhooks.length > 0) {
      console.log('Found existing webhooks:');
      existingWebhooks.forEach(webhook => {
        console.log(`  - ${webhook.id}: ${webhook.notificationUrl}`);
      });

      const shouldReplace = process.argv.includes('--replace');
      if (shouldReplace) {
        console.log('\n🗑️  Deleting existing webhooks...');
        for (const webhook of existingWebhooks) {
          await deleteWebhook(webhook.id);
        }
      } else {
        console.log('\n⚠️  Existing webhooks found. Use --replace flag to replace them.');
        return;
      }
    }

    // Create single webhook for both tables
    console.log('\n📡 Creating single webhook for both tables...');

    const webhook = await createCombinedWebhook([roomsTable.id, bookingsTable.id], 'Rooms and Bookings');

    // Generate environment variables
    console.log('\n📝 Add these environment variables to your .env file:');
    console.log('');
    console.log(`# Webhook Configuration`);
    console.log(`AIRTABLE_MEETING_ROOMS_TABLE_ID=${roomsTable.id}`);
    console.log(`AIRTABLE_BOOKINGS_TABLE_ID=${bookingsTable.id}`);
    console.log(`AIRTABLE_WEBHOOK_SECRET=${webhook.macSecretBase64}`);
    console.log('');

    console.log('✅ Webhook setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add the environment variables above to your .env file');
    console.log('2. Restart your application');
    console.log('3. Test the webhooks by modifying records in Airtable');

  } catch (error) {
    console.error('❌ Error setting up webhooks:', error);
    process.exit(1);
  }
}

/**
 * Lists all existing webhooks
 */
async function listExistingWebhooks() {
  try {
    console.log('📋 Listing existing webhooks...\n');

    const webhooks = await listWebhooks();

    if (webhooks.length === 0) {
      console.log('No webhooks found.');
      return;
    }

    console.log(`Found ${webhooks.length} webhook(s):\n`);

    webhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. Webhook ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.notificationUrl}`);
      console.log(`   Secret: ${webhook.macSecretBase64}`);
      console.log(`   Filters: ${JSON.stringify(webhook.specification.options.filters, null, 2)}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing webhooks:', error);
    process.exit(1);
  }
}

/**
 * Deletes all webhooks
 */
async function deleteAllWebhooks() {
  try {
    console.log('🗑️  Deleting all webhooks...\n');

    const webhooks = await listWebhooks();

    if (webhooks.length === 0) {
      console.log('No webhooks to delete.');
      return;
    }

    for (const webhook of webhooks) {
      await deleteWebhook(webhook.id);
    }

    console.log(`\n✅ Deleted ${webhooks.length} webhook(s) successfully!`);

  } catch (error) {
    console.error('❌ Error deleting webhooks:', error);
    process.exit(1);
  }
}

/**
 * Main script runner
 */
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'create':
    case 'setup':
      await setupWebhooks();
      break;
    case 'list':
      await listExistingWebhooks();
      break;
    case 'delete':
      await deleteAllWebhooks();
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log('Airtable Webhook Management Script');
      console.log('');
      console.log('Usage:');
      console.log('  npx tsx scripts/setup-webhooks.ts <command> [options]');
      console.log('');
      console.log('Commands:');
      console.log('  create, setup    Create webhooks for rooms and bookings tables');
      console.log('  list             List all existing webhooks');
      console.log('  delete           Delete all webhooks');
      console.log('  help             Show this help message');
      console.log('');
      console.log('Options:');
      console.log('  --replace        Replace existing webhooks when creating new ones');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx scripts/setup-webhooks.ts create');
      console.log('  npx tsx scripts/setup-webhooks.ts create --replace');
      console.log('  npx tsx scripts/setup-webhooks.ts list');
      console.log('  npx tsx scripts/setup-webhooks.ts delete');
      break;
    default:
      console.log('❌ Unknown command. Use "help" to see available commands.');
      process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}