# 🚀 Deployment Guide - Digital Sherlock API

## Deploy to Vercel with guardaweb.info Domain

### ✅ Automatic Configuration

- ✅ `vercel.json` - Vercel configuration with domain and environment variables
- ✅ `scripts/setup-vercel-env.sh` - Script to configure Supabase variables
- ✅ Auto-deploy on every push to `main`
- ✅ Supabase integration configured

---

## 🔧 Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

---

## 🔑 Step 2: Configure Environment Variables on Vercel

### Option A: Automatic Setup (Recommended) ⚡

```bash
bash scripts/setup-vercel-env.sh
```

You will be prompted to enter:
1. **Supabase URL** (https://dihzcnfysysszztyaynr.supabase.co)
2. **SERVICE ROLE KEY** (Settings → API → Service role secret)
3. **PUBLISHABLE KEY** (Settings → API → anon public)

### Option B: Manual Configuration

1. Go to: https://vercel.com/dashboard
2. Select `digital-sherlock-api` project
3. Navigate to **Settings → Environment Variables**
4. Add these 4 variables for all environments (Production, Preview, Development):
   - `SUPABASE_URL` = `https://dihzcnfysysszztyaynr.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_UUrLi2EgQi0KdWPENCMcoA_G3HXXrfg`
   - `SUPABASE_SERVICE_ROLE_KEY` = (from your Supabase dashboard)
   - `VITE_SUPABASE_URL` = `https://dihzcnfysysszztyaynr.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_UUrLi2EgQi0KdWPENCMcoA_G3HXXrfg`

---

## 📤 Step 3: Automatic Deployment

Just push to main branch:

```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

**Vercel will automatically deploy!** 🎉

---

## 🔍 Check Deployment Status

```bash
# List recent deployments
vercel ls

# Check deployment details
vercel inspect

# View build logs
vercel logs
```

---

## 📋 Final Checklist

- [ ] Vercel CLI installed (`vercel --version`)
- [ ] Environment variables configured on Vercel
- [ ] `git push` executed
- [ ] Deploy completed (https://vercel.com/dashboard)
- [ ] Site accessible at `https://guardaweb.info`
- [ ] Supabase connection working (check browser console)

---

## 🚨 Troubleshooting

### ❌ "Missing Supabase environment variables"

**Solution**: Re-run the setup script:
```bash
bash scripts/setup-vercel-env.sh
```

### ❌ Domain not working

Check DNS settings:
1. Go to your domain registrar
2. Ensure DNS points to `cname.vercel-dns.com`
3. Wait for DNS propagation (up to 48 hours)

### ❌ Build fails

1. Check logs: `vercel logs`
2. Verify variables: `vercel env ls`
3. Redeploy: `vercel deploy --prod`
4. Check that `.env` file has all required variables

---

**Ready! 🎉 Your site is configured for automatic deployment!**

More info: https://vercel.com/docs
