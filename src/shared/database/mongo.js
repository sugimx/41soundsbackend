import mongoose from 'mongoose';

export class MongoDatabase {
  static instance;

  constructor() {}

  static getInstance() {
    if (!MongoDatabase.instance) {
      MongoDatabase.instance = new MongoDatabase();
    }
    return MongoDatabase.instance;
  }

  async connect() {
    try {
      const uri = process.env.MONGODB_URI;
      
      if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      console.log('🔄 Attempting to connect to MongoDB...');
      console.log('URI:', uri.replace(/:[^:]*@/, ':****@')); // Hide password

      const options = {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 15000, // Increased from default
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
        connectTimeoutMS: 15000,
      };

      await mongoose.connect(uri, options);
      console.log('✅ Connected to MongoDB Atlas');
      
      // Log connection info
      console.log('DB Name:', mongoose.connection.name);
      console.log('Host:', mongoose.connection.host);
      
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      console.error('Code:', error.code);
      console.error('Full Error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ MongoDB disconnection error:', error);
      throw error;
    }
  }

  getConnection() {
    return mongoose.connection;
  }
}

export const mongoDatabase = MongoDatabase.getInstance();
