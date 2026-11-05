import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/caawiyedental';
    const conn = await mongoose.connect(dbUri);
    console.log(`[MongoDB Connected]: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    // Do not terminate process in dev so the server can attempt auto-reconnect or allow in-memory/diagnostics
  }
};

export default connectDB;
