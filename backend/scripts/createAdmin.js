/**
 * Utility script to create or promote an admin user
 * Usage: node backend/scripts/createAdmin.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

async function createAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    // Get email from command line or use default
    const email = process.argv[2] || 'admin@gmail.com';
    const password = process.argv[3] || 'Admin@123';
    const name = process.argv[4] || 'Admin User';

    // Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (existingUser.role === 'admin') {
        console.log(`✅ Admin user already exists: ${email}`);
      } else {
        // Promote to admin
        existingUser.role = 'admin';
        await existingUser.save();
        console.log(`✅ User promoted to admin: ${email}`);
      }
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`✅ Admin user created successfully`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Name: ${name}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
