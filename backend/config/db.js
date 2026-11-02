const mongoose = require('mongoose');

const connectDB = async () => {
  // MONGO_DB_URI is the name used by the original template, so accept it too.
  const mongoUri = process.env.MONGO_URI || process.env.MONGO_DB_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing. Add it to backend/.env');
  }

  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};

module.exports = connectDB;
