const cloudinary = require('cloudinary').v2;

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'cloudinary';

// Initialize Cloudinary if provider is cloudinary (or default)
if (STORAGE_PROVIDER === 'cloudinary') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads media file to either Cloudinary or AWS S3 based on STORAGE_PROVIDER
 * @param {Object} options
 * @param {Object} options.file - Multer file object
 * @param {string} options.folder - Destination folder
 * @param {string} [options.resourceType='image'] - 'image' or 'video'
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadMedia({ file, folder, resourceType = 'image' }) {
  if (!file) return { url: null, publicId: null };

  if (STORAGE_PROVIDER === 's3') {
    try {
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const crypto = require('crypto');
      const path = require('path');

      const region = process.env.AWS_REGION || 'us-east-1';
      const bucket = process.env.S3_BUCKET_NAME;

      if (!bucket) {
        throw new Error('S3_BUCKET_NAME environment variable is not defined.');
      }

      const s3Client = new S3Client({ region });
      const ext = path.extname(file.originalname) || (resourceType === 'video' ? '.mp4' : '.jpg');
      const key = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype
      });

      await s3Client.send(command);

      const url = process.env.CLOUDFRONT_DOMAIN 
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`
        : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      return {
        url,
        publicId: key
      };
    } catch (err) {
      console.error('S3 Upload Error, falling back to Cloudinary if available:', err.message);
      if (process.env.CLOUDINARY_CLOUD_NAME) {
        return uploadToCloudinary(file, folder, resourceType);
      }
      throw err;
    }
  }

  return uploadToCloudinary(file, folder, resourceType);
}

async function uploadToCloudinary(file, folder, resourceType) {
  const b64 = Buffer.from(file.buffer).toString('base64');
  const dataURI = "data:" + file.mimetype + ";base64," + b64;
  const uploadResponse = await cloudinary.uploader.upload(dataURI, { 
    folder,
    resource_type: resourceType === 'video' ? 'video' : 'auto'
  });
  return {
    url: uploadResponse.secure_url,
    publicId: uploadResponse.public_id
  };
}

/**
 * Deletes media file from either Cloudinary or AWS S3
 * @param {string} publicId
 * @param {string} [resourceType='image']
 */
async function deleteMedia(publicId, resourceType = 'image') {
  if (!publicId) return;

  if (STORAGE_PROVIDER === 's3') {
    try {
      const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
      const region = process.env.AWS_REGION || 'us-east-1';
      const bucket = process.env.S3_BUCKET_NAME;
      if (bucket) {
        const s3Client = new S3Client({ region });
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: publicId }));
        return;
      }
    } catch (err) {
      console.error('S3 delete error:', err.message);
    }
  }

  try {
    const isVideo = resourceType === 'video';
    await cloudinary.uploader.destroy(publicId, { resource_type: isVideo ? 'video' : 'image' });
  } catch (err) {
    console.error('Cloudinary destroy error:', err.message);
  }
}

module.exports = {
  uploadMedia,
  deleteMedia,
  STORAGE_PROVIDER
};
