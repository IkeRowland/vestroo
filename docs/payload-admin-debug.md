# PayloadCMS Admin Debug Guide

## Issue: Admin Not Showing on Vercel

### Common Causes

1. **Missing Environment Variables**
   - `PAYLOAD_SECRET` - Required for PayloadCMS authentication
   - `DATABASE_URL` - Required for database connection
   - Check Vercel Dashboard → Settings → Environment Variables

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correctly set in Vercel
   - Check if Supabase project is active (not paused)
   - Verify connection string format

3. **Build-Time Issues**
   - Check Vercel build logs for errors
   - Verify all dependencies are installed correctly
   - Check for TypeScript compilation errors

4. **Routing Issues**
   - Admin should be accessible at `/admin`
   - Route group `(payload)` should not affect URL structure
   - Verify API routes at `/api/*` are working

### Debugging Steps

1. **Check Environment Variables in Vercel:**
   ```bash
   # Required variables:
   PAYLOAD_SECRET=your-secret-key-min-16-chars
   DATABASE_URL=postgresql://...
   ```

2. **Verify Admin Route:**
   - Visit: `https://your-domain.vercel.app/admin`
   - Check browser console for errors
   - Check network tab for failed requests

3. **Check API Endpoint:**
   - Visit: `https://your-domain.vercel.app/api/users/me`
   - Should return authentication status

4. **Review Build Logs:**
   - Go to Vercel Dashboard → Deployments → Latest → Build Logs
   - Look for errors related to PayloadCMS or admin

5. **Check PayloadCMS Configuration:**
   - Verify `admin.user` points to correct collection
   - Verify collections are properly registered
   - Check for any custom admin configuration

### Common Fixes

1. **If PAYLOAD_SECRET is missing:**
   - Add it to Vercel environment variables
   - Must be at least 16 characters (32+ recommended)
   - Redeploy after adding

2. **If database connection fails:**
   - Verify `DATABASE_URL` is correct
   - Check Supabase project status
   - Verify connection pooling settings

3. **If admin UI doesn't load:**
   - Clear browser cache
   - Try incognito/private mode
   - Check for CORS issues
   - Verify static assets are being served

### Testing Locally

1. **Build production build locally:**
   ```bash
   npm run build
   npm start
   ```

2. **Test admin locally:**
   - Visit: `http://localhost:3000/admin`
   - Verify it works in production mode

3. **Check for differences:**
   - Compare local vs Vercel environment
   - Check environment variable differences
   - Verify build outputs match

### Additional Resources

- [PayloadCMS Deployment Guide](https://payloadcms.com/docs/deployment/overview)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [PayloadCMS Admin Configuration](https://payloadcms.com/docs/configuration/overview#admin)

