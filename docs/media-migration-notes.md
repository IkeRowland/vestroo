# Media File Migration Notes

## Issue: Double Prefix Error

### Problem

When updating media files, PayloadCMS tries to delete old files and gets:
```
NoSuchKey: Object not found
Resource: "media/media/WhatsApp-Image-2024-09-04-at-18.52.10-22.jpeg"
```

### Root Cause

1. **Old files** (stored locally) have paths like: `media/filename.jpg`
2. **S3 configuration** was adding prefix: `prefix: 'media'`
3. **Result**: S3 looked for `media/media/filename.jpg` (double prefix)

### Solution

Removed the `prefix: 'media'` from S3 storage configuration because:
- The bucket is already named `media`
- Old files already include `media/` in their paths
- New files will be stored at bucket root (no prefix needed)

### File Path Structure

**Before (Local Storage):**
- Files stored in: `media/` directory
- Database paths: `media/filename.jpg`

**After (S3 Storage):**
- Files stored in: `media` bucket (at root)
- Database paths: `filename.jpg` (new uploads)
- Old paths still work: `media/filename.jpg` (for existing files)

### Migration Strategy

**Option 1: Clean Up Old Files (Recommended)**
1. Re-upload all media files through PayloadCMS admin
2. New files will have clean paths without `media/` prefix
3. Old files can be manually deleted from database or left as-is

**Option 2: Update Database Paths**
1. Run SQL to remove `media/` prefix from existing file paths:
   ```sql
   UPDATE media SET url = REPLACE(url, 'media/', '') WHERE url LIKE 'media/%';
   UPDATE media SET filename = REPLACE(filename, 'media/', '') WHERE filename LIKE 'media/%';
   ```

**Option 3: Keep Both (Current)**
- New uploads: stored without prefix
- Old files: still have `media/` prefix (won't cause issues for reads)
- Update operations may fail if trying to delete old files

### Recommendations

1. **For new projects**: No prefix needed (bucket name is sufficient)
2. **For migrations**: Re-upload media files or update database paths
3. **For existing files**: Leave as-is if they're only read, not updated

### Testing

After removing the prefix:
- ✅ New uploads work correctly
- ✅ Old files can still be read (if paths exist in S3)
- ⚠️ Updating old media files may fail (try re-upload instead)

