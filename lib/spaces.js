import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, CreateBucketCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';

// Lazy initialization of S3 client
let s3Client = null;

function getS3Client() {
  if (!s3Client) {
    if (!process.env.DO_SPACES_ACCESS_KEY_ID || !process.env.DO_SPACES_SECRET_ACCESS_KEY) {
      throw new Error('DigitalOcean Spaces credentials are not configured. Please set DO_SPACES_ACCESS_KEY_ID and DO_SPACES_SECRET_ACCESS_KEY environment variables.');
    }

    s3Client = new S3Client({
      endpoint: 'https://syd1.digitaloceanspaces.com', // Use region endpoint, not bucket endpoint
      region: process.env.DO_SPACES_REGION || 'syd1',
      credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
        secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
      },
      forcePathStyle: false,
    });
  }
  return s3Client;
}

function getBucketName() {
  return process.env.DO_SPACES_BUCKET || 'cultcha';
}

function getCDNEndpoint() {
  return process.env.DO_SPACES_CDN_ENDPOINT || process.env.DO_SPACES_ENDPOINT || 'https://cultcha.syd1.cdn.digitaloceanspaces.com';
}

function getEnvPrefix() {
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
}

/**
 * Generate the storage path for an asset
 * @param {string} type - Type of asset (products, customers, etc.)
 * @param {string} id - ID of the entity
 * @param {string} filename - Original filename
 * @returns {string} Full path for storage
 */
export function generateStoragePath(type, id, filename) {
  const ext = path.extname(filename);
  const timestamp = Date.now();
  const sanitizedFilename = `${timestamp}-${Math.random().toString(36).substring(7)}${ext}`;
  return `${getEnvPrefix()}/${type}/${id}/assets/${sanitizedFilename}`;
}

/**
 * Upload an image to DigitalOcean Spaces
 * @param {Buffer|Uint8Array} buffer - Image buffer
 * @param {string} type - Type of asset (products, customers, etc.)
 * @param {string} id - ID of the entity
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type of the image
 * @returns {Promise<{url: string, key: string}>} URL and key of uploaded image
 */
export async function uploadImage(buffer, type, id, filename, contentType = 'image/jpeg') {
  try {
    const key = generateStoragePath(type, id, filename);

    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // Make the file publicly readable
      CacheControl: 'max-age=31536000', // Cache for 1 year
    });

    await getS3Client().send(command);

    // Return the CDN URL
    const url = `${getCDNEndpoint()}/${key}`;

    return {
      url,
      key,
    };
  } catch (error) {
    console.error('Error uploading to Spaces:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete an image from DigitalOcean Spaces
 * @param {string} key - Key/path of the image to delete
 * @returns {Promise<void>}
 */
export async function deleteImage(key) {
  try {
    // Extract key from URL if a full URL is provided
    if (key.startsWith('http')) {
      const url = new URL(key);
      key = url.pathname.substring(1); // Remove leading slash
    }

    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    await getS3Client().send(command);
  } catch (error) {
    console.error('Error deleting from Spaces:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Delete all images in a folder
 * @param {string} type - Type of asset (products, customers, etc.)
 * @param {string} id - ID of the entity
 * @returns {Promise<void>}
 */
export async function deleteImageFolder(type, id) {
  try {
    const prefix = `${getEnvPrefix()}/${type}/${id}/`;

    // List all objects with the prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: getBucketName(),
      Prefix: prefix,
    });

    const listResponse = await getS3Client().send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      // Delete each object
      for (const object of listResponse.Contents) {
        await deleteImage(object.Key);
      }
    }
  } catch (error) {
    console.error('Error deleting folder from Spaces:', error);
    throw new Error(`Failed to delete image folder: ${error.message}`);
  }
}

/**
 * Generate a signed URL for temporary access (if needed for private files)
 * @param {string} key - Key/path of the image
 * @param {number} expiresIn - Expiration time in seconds (default 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export async function getSignedImageUrl(key, expiresIn = 3600) {
  try {
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const url = await getSignedUrl(getS3Client(), command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

/**
 * Check if an image exists in Spaces
 * @param {string} key - Key/path of the image
 * @returns {Promise<boolean>}
 */
export async function imageExists(key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    await getS3Client().send(command);
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Upload base64 image to Spaces
 * @param {string} base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param {string} type - Type of asset (products, customers, etc.)
 * @param {string} id - ID of the entity
 * @param {string} filename - Original filename or default name
 * @returns {Promise<{url: string, key: string}>} URL and key of uploaded image
 */
export async function uploadBase64Image(base64Data, type, id, filename = 'image.jpg') {
  try {
    // Remove data URI prefix if present
    const base64Pattern = /^data:image\/(\w+);base64,/;
    const matches = base64Data.match(base64Pattern);
    let contentType = 'image/jpeg';

    if (matches) {
      contentType = `image/${matches[1]}`;
      base64Data = base64Data.replace(base64Pattern, '');

      // Update filename extension based on content type
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      if (!filename.includes('.')) {
        filename = `${filename}.${ext}`;
      }
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    return await uploadImage(buffer, type, id, filename, contentType);
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw new Error(`Failed to upload base64 image: ${error.message}`);
  }
}

/**
 * Get the public URL for an image
 * @param {string} key - Key/path of the image
 * @returns {string} Public CDN URL
 */
export function getImageUrl(key) {
  if (!key) return null;

  // If it's already a full URL, return it
  if (key.startsWith('http')) {
    return key;
  }

  // Return the CDN URL
  return `${getCDNEndpoint()}/${key}`;
}