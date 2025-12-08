# PayloadCMS Admin Fix Checklist

## Issue Summary
PayloadCMS admin panel is not showing on Vercel deployment.

## Immediate Action Items

### 1. Verify Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables and verify:

- [ ] `PAYLOAD_SECRET` is set (minimum 16 characters)
- [ ] `DATABASE_URL` is set and correct
- [ ] All S3 storage variables are set (if using media uploads)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set (if needed)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (if needed)

**Action:** If any are missing, add them and redeploy.

### 2. Check Vercel Deployment Logs

1. Go to Vercel Dashboard → Deployments
2. Click on the latest deployment
3. Review build logs for:
   - [ ] TypeScript compilation errors
   - [ ] Missing module errors
   - [ ] Database connection errors
   - [ ] Environment variable errors

### 3. Test Admin Route

1. Visit: `https://your-domain.vercel.app/admin`
2. Check browser console (F12) for errors:
   - [ ] JavaScript errors
   - [ ] Failed network requests
   - [ ] CORS errors
   - [ ] Authentication errors

### 4. Test API Endpoints

Test these endpoints to verify PayloadCMS is working:

- [ ] `GET /api/users/me` - Should return auth status
- [ ] `GET /api/health` - Should return health check status

### 5. Common Issues & Solutions

#### Issue: "PayloadCMS secret not configured"
**Solution:** Add `PAYLOAD_SECRET` to Vercel environment variables

#### Issue: Database connection timeout
**Solution:** 
- Verify `DATABASE_URL` is correct
- Check if Supabase project is active (not paused)
- Try connection pooling endpoint

#### Issue: Admin UI loads but authentication fails
**Solution:**
- Verify Users collection is properly configured
- Check if you have created an admin user
- Verify database migrations have run

#### Issue: Blank page at /admin
**Solution:**
- Check browser console for errors
- Verify all static assets are loading
- Check for CORS issues
- Clear browser cache

## Zustand Deprecation Warning

The Zustand deprecation warning is coming from PayloadCMS dependencies, not our code. Our code uses the correct named import:

```typescript
import { create } from 'zustand'  // ✅ Correct
```

This is a harmless warning and doesn't affect functionality. It will be resolved when PayloadCMS updates its dependencies.

## Deployment Verification

After fixing issues, verify:

1. [ ] Admin panel loads at `/admin`
2. [ ] Can log in with admin credentials
3. [ ] Collections are visible
4. [ ] Can create/edit/delete records
5. [ ] Media uploads work (if S3 is configured)

## Next Steps

1. **If environment variables are missing:**
   - Add them to Vercel
   - Redeploy the application

2. **If database connection fails:**
   - Verify `DATABASE_URL` format
   - Check Supabase project status
   - Review connection pooling settings

3. **If admin still doesn't load:**
   - Check Vercel function logs
   - Review PayloadCMS documentation
   - Test locally with production build

## Testing Commands

```bash
# Build production build locally
npm run build

# Start production server locally
npm start

# Test admin locally
# Visit http://localhost:3000/admin
```

