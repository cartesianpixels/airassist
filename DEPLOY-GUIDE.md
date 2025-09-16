# 🚀 Complete Deployment Guide for ATC Assistant

**Choose your deployment method:**
- **[Quick Deploy (Non-Technical)](#-quick-deploy-for-non-technical-users)** - One-click deployment
- **[Pre-built Database Deploy](#-pre-built-database-deployment-recommended)** - Zero embedding costs
- **[Advanced Deploy](#-advanced-deployment)** - Full control and customization
- **[Local Development](#-local-development)** - Development setup

---

## 🎯 Quick Deploy (For Non-Technical Users)

**This is the easiest way - just follow these steps!**

## 📋 What You Need Before Starting

### 1. Get Your API Keys (Required)
You need these two API keys - they're like passwords for the AI services:

**Google Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (looks like: `AI...`)

**OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an OpenAI account
3. Click "Create new secret key"
4. Give it a name like "ATC Assistant"
5. Copy the key (looks like: `sk-...`)

⚠️ **IMPORTANT**: Keep these keys secret! Don't share them with anyone.

### 2. Install Fly.io CLI (One-time setup)

**Windows:**
1. Download from: https://fly.io/docs/flyctl/install/
2. Run the installer
3. Restart your computer

**Mac:**
1. Open Terminal
2. Type: `brew install flyctl`
3. Press Enter

**Linux:**
1. Open Terminal
2. Type: `curl -L https://fly.io/install.sh | sh`
3. Press Enter

### 3. Create Fly.io Account
1. Go to https://fly.io/app/sign-up
2. Sign up for a free account
3. Verify your email

## 🎯 Deploy in 3 Easy Steps

### Step 1: Download the Code
1. Download this project as a ZIP file
2. Extract it to your computer (like Desktop)
3. Open Terminal (Mac/Linux) or PowerShell (Windows)
4. Navigate to the folder:
   ```bash
   cd Desktop/airassist
   ```

### Step 2: Run the Magic Deployment Script

**Windows (PowerShell):**
```powershell
.\deploy-fly.ps1
```

**Mac/Linux (Terminal):**
```bash
chmod +x deploy-fly.sh
./deploy-fly.sh
```

### Step 3: Follow the Prompts
The script will ask you:
1. **"Do you want to continue?"** - Type `y` and press Enter
2. **"Enter your Google Gemini API Key:"** - Paste your Google key
3. **"Enter your OpenAI API Key:"** - Paste your OpenAI key

That's it! The script does everything else automatically.

## 🎉 After Deployment

### Your App Will Be Live At:
The script will show you a URL like: `https://airassist-xyz-123.fly.dev`

### What Happens Next:
1. **Wait 2-3 minutes** for everything to start up
2. **Visit your URL** to test the app
3. **Ask a question** like "What are IFR separation requirements?"
4. **Celebrate!** 🎉 Your AI assistant is live!

## 🔧 Managing Your App

### View Your App Dashboard:
```bash
flyctl dashboard your-app-name
```

### Check If Everything Is Working:
```bash
flyctl logs --app your-app-name
```

### Make Your App Faster (Optional):
```bash
flyctl scale count 2 --app your-app-name
```

## 💰 Costs (Important!)

### Fly.io Costs:
- **App hosting**: ~$5-10/month
- **Database**: $0-15/month (depending on usage)
- **Redis cache**: Free tier available

### AI API Costs:
- **Google Gemini**: Very cheap (~$0.01 per chat)
- **OpenAI Embeddings**: ~$0.10 per 1000 searches

**Total monthly cost: Usually $10-25/month**

## 🆘 If Something Goes Wrong

### Common Issues:

**"Command not found"**
- Install Fly.io CLI properly and restart your terminal

**"Not logged in"**
- The script will open a browser to log you in

**"API key invalid"**
- Double-check you copied the keys correctly
- Make sure there are no extra spaces

**"App won't start"**
- Wait 5 minutes and try again
- Check logs: `flyctl logs --app your-app-name`

### Get Help:
1. Check the logs first: `flyctl logs --app your-app-name`
2. Look at your app dashboard: `flyctl dashboard your-app-name`
3. Ask for help in the project issues

## 🔒 Security Best Practices

### Keep Your Keys Safe:
- ✅ Never share your API keys
- ✅ Never post them online
- ✅ Store them in a password manager
- ❌ Don't put them in emails or messages

### Monitor Usage:
- Check your OpenAI usage: https://platform.openai.com/usage
- Check your Google usage: https://console.cloud.google.com/
- Set up billing alerts

### Update Regularly:
- Get notified of updates
- Re-deploy when needed: `flyctl deploy --app your-app-name`

## 📞 Support

If you need help:
1. **Check the logs first** (see above)
2. **Read the error message carefully**
3. **Ask for help** with specific error messages
4. **Include your app name** when asking for help

## 🎯 Quick Reference Commands

```bash
# Check app status
flyctl status --app your-app-name

# View logs
flyctl logs --app your-app-name

# Open app in browser
flyctl open --app your-app-name

# Scale app (make it faster)
flyctl scale count 2 --app your-app-name

# Update app
flyctl deploy --app your-app-name

# Stop app (saves money)
flyctl scale count 0 --app your-app-name

# Restart app
flyctl scale count 1 --app your-app-name
```

---

**🎉 Congratulations! You've successfully deployed a professional AI application!**

---

## 🏭 Pre-built Database Deployment (Recommended)

**💰 SAVE MONEY: This method eliminates embedding API costs in production!**

### Why Use Pre-built Database?
- ✅ **Zero embedding costs** - Generate once, deploy everywhere
- ✅ **Instant startup** - No waiting for embeddings to generate
- ✅ **Consistent data** - Same embeddings across all deployments
- ✅ **Version control** - Track knowledge base changes

### Step-by-Step Process

#### 1. Build Production Database Locally
```bash
# Make sure you have your OpenAI API key set
export OPENAI_API_KEY="your_openai_key_here"

# Build database with embeddings (one-time cost)
./scripts/build-production-db.sh
```

This will:
- Start development databases
- Generate embeddings for all knowledge base content
- Create database dump files in `dumps/` directory
- Show statistics about the generated data

#### 2. Deploy with Pre-built Database
```bash
# Deploy to Fly.io with pre-built data
./scripts/deploy-with-dump.sh
```

This will:
- Deploy your application to Fly.io
- Upload and restore the database dump
- Verify the deployment works
- **No API calls during production deployment!**

#### 3. Managing Database Updates

When your knowledge base changes:
```bash
# Rebuild database with new content
./scripts/build-production-db.sh

# Redeploy with updated data  
./scripts/deploy-with-dump.sh
```

### 💡 Development Workflow

```bash
# 1. Work on your knowledge base locally
# Add/edit files in data/ directory

# 2. Test changes
npm run docker:dev
npm run db:migrate
npm run seed
npm run dev

# 3. When ready for production
./scripts/build-production-db.sh  # Creates dumps/
git add dumps/
git commit -m "Update knowledge base"

# 4. Deploy with zero embedding costs
./scripts/deploy-with-dump.sh
```

---

## 🔧 Advanced Deployment

### Manual Fly.io Setup

```bash
# 1. Initialize Fly.io app
flyctl apps create airassist --generate-name

# 2. Set up databases
flyctl postgres create --name airassist-db --region ord
flyctl postgres attach airassist-db

flyctl redis create --name airassist-redis --region ord  
flyctl redis attach airassist-redis

# 3. Set secrets manually
flyctl secrets set GOOGLE_API_KEY="your-key" OPENAI_API_KEY="your-key"

# 4. Deploy
flyctl deploy --dockerfile Dockerfile.fly
```

### Docker Compose (Local/VPS)

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production  
docker-compose up --build -d
```

### Environment Variables Management

```bash
# Update secrets securely
./fly-secrets.sh your-app-name update

# List current secrets
flyctl secrets list --app your-app-name

# Backup secrets
./fly-secrets.sh your-app-name backup
```

---

## 💻 Local Development

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/your-username/airassist.git
cd airassist

# 2. Start databases only
docker-compose -f docker-compose.dev.yml up -d

# 3. Install and run
npm install
npm run dev
```

### Manual Setup
```bash
# Install PostgreSQL with pgvector
# Install Redis  
# Install Qdrant

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Run migrations
npm run db:migrate
npm run seed

# Start development server
npm run dev
```

---

## 🔍 Monitoring & Maintenance

### Health Checks
```bash
# Check app health
./fly-healthcheck.sh your-app-name

# View logs
flyctl logs --app your-app-name

# Monitor resource usage
flyctl vm status --app your-app-name
```

### Scaling & Performance
```bash
# Scale app instances
flyctl scale count 2 --app your-app-name

# Upgrade VM size
flyctl scale vm shared-cpu-2x --app your-app-name

# Add more regions
flyctl regions add lax sea --app your-app-name
```

### Database Management
```bash
# Connect to database
flyctl postgres connect --app your-app-name-db

# Backup database
flyctl ssh console -a your-app-name -C "pg_dump \$DATABASE_URL > backup.sql"

# Monitor database performance
flyctl postgres list --app your-app-name-db
```

---

## 🛠️ Troubleshooting

### Common Issues

**App won't start:**
```bash
flyctl logs --app your-app-name
# Check for missing environment variables
flyctl secrets list --app your-app-name
```

**Database connection errors:**
```bash
# Test database connection
flyctl ssh console -a your-app-name -C "psql \$DATABASE_URL -c 'SELECT version();'"
```

**API errors:**
- Verify API keys are correct
- Check API usage limits
- Monitor costs in API dashboards

### Getting Help
1. Check logs: `flyctl logs --app your-app-name`
2. Run health check: `./fly-healthcheck.sh your-app-name`  
3. Review Fly.io status: https://status.fly.io/
4. Ask for help with specific error messages

---

**Questions? Problems? Don't hesitate to ask for help!**