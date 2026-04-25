import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../../.env');

dotenv.config({ path: envPath });

async function testConnection() {
  try {
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      throw new Error('MONGODB_URI is not set in .env');
    }

    console.log('🔄 Attempting to connect to MongoDB Atlas...');
    console.log(`📍 URI: ${uri.split('@')[0]}@***`);

    await mongoose.connect(uri);
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log(`📊 Database: ${process.env.MONGODB_DATABASE}`);
    
    // Test the connection
    const connection = mongoose.connection;
    console.log(`🔗 Connection State: ${connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // List databases
    if (connection.db) {
      const admin = connection.db.admin();
      const databases = await admin.listDatabases();
      console.log(`\n📂 Available Databases:`);
      databases.databases.forEach((db) => {
        console.log(`   - ${db.name}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected successfully');
    
  } catch (error) {
    console.error('❌ Connection Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testConnection();
