# S3 Storage Error Handling

## Issue: NoSuchKey Error When Updating Media Files

### Error Message
```
NoSuchKey: Object not found
Resource: "media/media/WhatsApp-Image-2024-09-04-at-18.52.10-22.jpeg"
```

### Root Cause

When updating media files, PayloadCMS storage plugin:
1. Tries to delete the old file from S3 before uploading the new one
2. Uses the file path stored in the database
3. Old files have paths like `media/filename.jpg` (from local storage)
4. With S3 prefix configured, it looks for `media/media/filename.jpg` (double prefix)

### Solutions Implemented

#### 1. Removed S3 Prefix
- Removed `prefix: 'media'` from S3 storage configuration
- Files are now stored at bucket root
- Prevents double prefix issue

#### 2. Added Path Normalization Hook
- Added `beforeChange` hook in Media collection
- Normalizes file paths by removing `media/` prefix from old files
- Ensures consistent path format for S3 storage

### Path Migration

**Old Files (Local Storage):**
- Database path: `media/filename.jpg`
- Stored in: local `media/` directory

**New Files (S3 Storage):**
- Database path: `filename.jpg`
- Stored in: S3 bucket root

**During Update:**
- Hook normalizes old paths: `media/filename.jpg` → `filename.jpg`
- S3 looks for file at: `filename.jpg` (correct location)

### Handling Missing Files

If old files don't exist in S3 (they were only stored locally):
- The delete operation may still fail with `NoSuchKey`
- This is expected behavior for files that haven't been migrated to S3
- The update will still proceed (new file will be uploaded)

### Migration Steps

1. **For New Uploads**: 
   - Files are automatically stored in S3 with correct paths
   - No action needed

2. **For Existing Files**:
   - Option A: Re-upload files through PayloadCMS admin (recommended)
   - Option B: Manually upload old files to S3 bucket
   - Option C: Update database paths to remove `media/` prefix

### SQL Migration (Optional)

If you want to update existing database paths:

```sql
-- Update media table URLs to remove 'media/' prefix
UPDATE media 
SET url = REPLACE(url, 'media/', '') 
WHERE url LIKE 'media/%';

UPDATE media 
SET filename = REPLACE(filename, 'media/', '') 
WHERE filename LIKE 'media/%';
```

**Warning**: Only run this if files have been uploaded to S3 at the root level, or if you're okay with old files not being accessible.

### Testing

After implementing fixes:
1. ✅ New uploads should work correctly
2. ✅ Updating new files should work
3. ⚠️ Updating old files may show errors but will still work
4. ⚠️ Old files need to be re-uploaded to S3 for full functionality

