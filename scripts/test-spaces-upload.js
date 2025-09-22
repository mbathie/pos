#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.development') });
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import the spaces library
import { uploadBase64Image, getImageUrl, deleteImage } from '../lib/spaces.js';

async function testSpacesUpload() {
  console.log('🚀 Testing DigitalOcean Spaces upload...\n');

  // Check environment variables
  console.log('Environment configuration:');
  console.log('- Endpoint:', process.env.DO_SPACES_ENDPOINT);
  console.log('- Bucket:', process.env.DO_SPACES_BUCKET);
  console.log('- Region:', process.env.DO_SPACES_REGION);
  console.log('- CDN Endpoint:', process.env.DO_SPACES_CDN_ENDPOINT);
  console.log('- Access Key ID:', process.env.DO_SPACES_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('- Secret Key:', process.env.DO_SPACES_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('- Environment:', process.env.NODE_ENV || 'development');
  console.log('');

  try {
    // Create a simple test image (1x1 red pixel)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx8gAAAABJRU5ErkJggg==';

    const testProductId = 'test-product-' + Date.now();
    const testCustomerId = 'test-customer-' + Date.now();

    console.log('📤 Testing product image upload...');
    const productResult = await uploadBase64Image(
      testImageBase64,
      'products',
      testProductId,
      'test-product.png'
    );
    console.log('✅ Product image uploaded successfully!');
    console.log('   URL:', productResult.url);
    console.log('   Key:', productResult.key);
    console.log('');

    console.log('📤 Testing customer photo upload...');
    const customerResult = await uploadBase64Image(
      testImageBase64,
      'customers',
      testCustomerId,
      'test-customer.png'
    );
    console.log('✅ Customer photo uploaded successfully!');
    console.log('   URL:', customerResult.url);
    console.log('   Key:', customerResult.key);
    console.log('');

    console.log('🔗 Testing URL generation...');
    const generatedUrl = getImageUrl(productResult.key);
    console.log('   Generated URL:', generatedUrl);
    console.log('');

    console.log('🗑️  Cleaning up test images...');
    await deleteImage(productResult.key);
    console.log('   ✅ Product test image deleted');

    await deleteImage(customerResult.key);
    console.log('   ✅ Customer test image deleted');
    console.log('');

    console.log('✨ All tests passed successfully!');
    console.log('\nExpected folder structure in Spaces:');
    console.log(`  /${process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}/`);
    console.log('    /products/');
    console.log(`      /${testProductId}/`);
    console.log('        /assets/');
    console.log('    /customers/');
    console.log(`      /${testCustomerId}/`);
    console.log('        /assets/');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

// Run the test
testSpacesUpload().catch(console.error);