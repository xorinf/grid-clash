import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema({
  section: { type: String, unique: true },
  html: String,
  lastUpdated: Date
});

export default mongoose.model('Content', contentSchema); 