# Deploying to Vercel

Your project is ready to deploy! Follow these steps:

## Quick Deploy Steps

1. **Go to Vercel**: Visit https://vercel.com/new (already open in browser)

2. **Sign in with GitHub**: Click "Continue with GitHub" and authorize Vercel to access your repositories

3. **Import Repository**: 
   - After connecting GitHub, you'll see a list of your repositories
   - Find and select `stephdiedrich/basicfinance` (or search for "basicfinance")

4. **Configure Project** (Vercel will auto-detect Next.js):
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should be auto-filled)
   - **Output Directory**: `.next` (should be auto-filled)
   - **Install Command**: `npm install` (should be auto-filled)

5. **Deploy**: Click "Deploy" button

6. **Wait for Build**: Vercel will:
   - Install dependencies
   - Build your Next.js app
   - Deploy it to a live URL

7. **Access Your App**: Once deployed, you'll get a URL like:
   - `https://basic-finance-xxxxx.vercel.app`
   - You can also set a custom domain later

## Important Notes

- ✅ Your app uses **localStorage** which works perfectly in the browser
- ✅ No environment variables needed for this version
- ✅ All data is stored locally in each user's browser
- ✅ The app will work immediately after deployment

## After Deployment

- Your app will be live and accessible from any browser
- Each browser/device will have its own separate localStorage data
- You can make changes locally and push to GitHub, then Vercel will auto-deploy updates

## Troubleshooting

If the build fails:
- Check the build logs in Vercel dashboard
- Make sure all dependencies are in `package.json`
- Verify `next.config.js` is properly configured

