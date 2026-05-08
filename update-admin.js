import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function updateAdminRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection;
    const collection = db.collection('users');
    
    // Update admin@test.com to have admin role
    const result = await collection.updateOne(
      { email: 'admin@test.com' },
      { $set: { role: 'admin' } }
    );
    
    console.log('✅ Updated user role to admin');
    console.log('Modified count:', result.modifiedCount);
    
    // Verify the update
    const user = await collection.findOne({ email: 'admin@test.com' });
    console.log('User after update:', JSON.stringify(user, null, 2));
    
    await mongoose.disconnect();
    console.log('✅ Done');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

updateAdminRole();
