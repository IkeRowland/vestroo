# Supabase Storage Setup Guide

This guide explains how to configure Supabase Storage for PayloadCMS media uploads.

## Overview

PayloadCMS media files are stored in Supabase Storage using the S3-compatible API. This ensures files persist across deployments and server restarts, which is essential for Vercel deployments where the filesystem is ephemeral.

## Prerequisites

- Supabase project created
- Access to Supabase Dashboard
- PayloadCMS configured with `@payloadcms/storage-s3`

## Setup Steps

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New bucket**
4. Name the bucket: `media`
5. Make it **Public** if you want public access to images
6. Click **Create bucket**

### 2. Generate S3 Credentials

1. In Supabase Dashboard, go to **Settings** → **Storage**
2. Find the **S3 API** section
3. Click **Generate new key** to create S3 access credentials
4. Copy the following:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint** (format: `https://[project-ref].storage.supabase.co/storage/v1/s3`)
   - **Region** (usually your project region, e.g., `us-east-1`, `eu-west-1`)

### 3. Configure Environment Variables

Add the following to your `.env` file (or Vercel environment variables):

```bash
# Supabase Storage S3 Configuration
S3_ENDPOINT=https://[project-ref].storage.supabase.co/storage/v1/s3
S3_REGION=us-east-1  # Replace with your project region
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET=media
```

**Important:** 
- Replace `[project-ref]` with your actual Supabase project reference
- Get your project reference from the Supabase Dashboard URL or project settings
- Never commit these credentials to version control

### 4. Update Vercel Environment Variables

For production deployments:

1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add all S3 environment variables:
   - `S3_ENDPOINT`
   - `S3_REGION`
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_BUCKET`
3. Redeploy your application

### 5. Configure Storage Bucket Policies (Optional)

If you made the bucket public, you may want to configure access policies:

1. Go to **Storage** → **Policies** for the `media` bucket
2. Create policies as needed:
   - **Public read**: Allow anyone to read files
   - **Authenticated upload**: Allow authenticated users to upload
   - **Admin full access**: Allow admin users full control

Example policy for public read access:
```sql
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT
USING (bucket_id = 'media');
```

## Configuration Details

### PayloadCMS Configuration

The S3 storage adapter is configured in `payload.config.ts`:

```typescript
plugins: [
  s3Storage({
    collections: {
      media: {
        bucket: env.S3_CONFIG.bucket,
        prefix: 'media',
      },
    },
    options: {
      endpoint: env.S3_CONFIG.endpoint,
      region: env.S3_CONFIG.region,
      credentials: {
        accessKeyId: env.S3_CONFIG.credentials.accessKeyId,
        secretAccessKey: env.S3_CONFIG.credentials.secretAccessKey,
      },
      forcePathStyle: true, // Required for Supabase Storage
    },
  }),
],
```

### Next.js Image Configuration

Images from Supabase Storage are allowed in `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '*.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
  ],
},
```

## Accessing Images

Images uploaded through PayloadCMS will be accessible via:

```
https://[project-ref].supabase.co/storage/v1/object/public/media/[file-path]
```

Or using the storage subdomain:

```
https://[project-ref].storage.supabase.co/storage/v1/object/public/media/[file-path]
```

## Troubleshooting

### Images not displaying

1. **Check bucket is public**: Go to Storage → Buckets → `media` → Settings → Make sure "Public bucket" is enabled
2. **Verify environment variables**: Ensure all S3 environment variables are set correctly
3. **Check Next.js config**: Verify `remotePatterns` includes your Supabase domain
4. **Verify bucket name**: Ensure `S3_BUCKET` matches the actual bucket name in Supabase
5. **Check CORS**: If accessing from client, ensure CORS is configured in Supabase Storage settings

### Upload errors

1. **Check credentials**: Verify S3 access keys are correct and not expired
2. **Verify endpoint**: Ensure the S3 endpoint URL is correct (should include `.storage.supabase.co`)
3. **Check permissions**: Ensure the bucket exists and you have write permissions
4. **Review logs**: Check PayloadCMS and Vercel deployment logs for detailed error messages

### Development vs Production

- **Development**: Can work with local storage (`staticDir`) or S3
- **Production**: **Must** use S3 storage (Supabase Storage) as Vercel filesystem is read-only

## Security Considerations

- **S3 Credentials**: These provide full access to your Storage buckets. Keep them secure and never expose them to the client.
- **Bucket Policies**: Configure RLS policies to restrict access as needed
- **Public vs Private**: Consider making buckets private and serving images through authenticated endpoints for sensitive content

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase S3 Authentication Guide](https://supabase.com/docs/guides/storage/s3/authentication)
- [PayloadCMS S3 Storage Plugin](https://payloadcms.com/docs/storage/s3)

