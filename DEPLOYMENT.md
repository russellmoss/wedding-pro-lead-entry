# Vercel Deployment Guide

## Prerequisites
- ✅ Vercel CLI installed: `npm install -g vercel`
- ✅ Git repository initialized
- ✅ All code changes committed

## Step 1: Set Up Environment Variables

### Option A: Using Vercel CLI
```bash
# Set your Klaviyo API key
vercel env add KLAVIYO_API_KEY
# Enter your Klaviyo API key when prompted: [YOUR_KLAVIYO_API_KEY]
```

### Option B: Using Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Create a new project
3. Go to Settings → Environment Variables
4. Add:
   - **Name:** `KLAVIYO_API_KEY`
   - **Value:** `[YOUR_KLAVIYO_API_KEY]`
   - **Environment:** Production, Preview, Development

## Step 2: Deploy to Vercel

### First Deployment
```bash
# Deploy to Vercel
vercel

# Follow the prompts:
# - Set up and deploy? → Y
# - Which scope? → Select your account
# - Link to existing project? → N
# - Project name: → manual-wedding-leads
# - Directory: → ./ (current directory)
# - Override settings? → N
```

### Subsequent Deployments
```bash
# Deploy to production
vercel --prod

# Or just push to your main branch (if connected to Git)
git push origin main
```

## Step 3: Update CORS Configuration

After deployment, update the CORS origins in `proxy.js`:

1. Get your Vercel domain (e.g., `https://manual-wedding-leads.vercel.app`)
2. Update the CORS configuration in `proxy.js`:
   ```javascript
   origin: process.env.NODE_ENV === 'production' 
     ? ['https://manual-wedding-leads.vercel.app', 'https://your-custom-domain.com']
     : ['http://localhost:3000'],
   ```
3. Redeploy: `vercel --prod`

## Step 4: Test the Deployment

1. **Test the health endpoint:** `https://your-domain.vercel.app/api/health`
2. **Test the form submission** with a new email
3. **Verify in Klaviyo** that profiles are created and subscribed
4. **Check Zapier** that webhook data is received

## Step 5: Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Settings → Domains
3. Add your custom domain (e.g., `leads.mileaestate.com`)
4. Update CORS configuration with the new domain
5. Redeploy

## Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `KLAVIYO_API_KEY` | `[YOUR_KLAVIYO_API_KEY]` | Your Klaviyo private API key |
| `NODE_ENV` | `production` | Set automatically by Vercel |

## Troubleshooting

### Build Errors
- Ensure all dependencies are in `package.json`
- Check that `react-scripts build` works locally

### API Errors
- Verify environment variables are set correctly
- Check Vercel function logs in the dashboard
- Test the health endpoint: `/api/health`

### CORS Errors
- Update CORS origins in `proxy.js` with your actual domain
- Redeploy after CORS changes

### Klaviyo Issues
- Verify API key is correct
- Check Klaviyo API rate limits
- Ensure list ID is correct: `QQSfkG`

## Production URLs

- **Form:** `https://your-domain.vercel.app/`
- **API Health:** `https://your-domain.vercel.app/api/health`
- **Zapier Webhook:** `https://your-domain.vercel.app/api/zapier`
- **Klaviyo API:** `https://your-domain.vercel.app/api/klaviyo/*`

## Monitoring

- **Vercel Dashboard:** Monitor function logs and performance
- **Klaviyo Dashboard:** Check profile creation and list subscriptions
- **Zapier Dashboard:** Monitor webhook triggers and task usage 