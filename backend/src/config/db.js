import mongoose from 'mongoose';

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;


  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(uri);
  console.log(`MongoDb connected successfully - ${connection.connection.host}`);
}

export default connectDatabase;
