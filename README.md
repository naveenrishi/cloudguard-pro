# 🌩️ CloudGuard Pro

Enterprise-grade multi-cloud cost optimization and management platform.

## 🚀 Features

- ✅ **Multi-Cloud Support** - AWS, Azure, GCP
- 💰 **Cost Tracking** - Real-time cost monitoring and forecasting
- 🔥 **AWS Nuke Automation** - Automated resource cleanup for sandbox/training accounts
- 🔔 **Health Monitoring** - Cloud provider outage detection with email alerts
- 📊 **Security & Compliance** - Posture assessment and compliance tracking
- 🗺️ **Cloud Footprint Map** - Global resource distribution visualization
- 🔐 **Enterprise Security** - MFA, email verification, JWT authentication
- 📧 **Email Notifications** - Automated alerts for outages and nuke schedules

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Recharts
- Lucide Icons

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL (Railway)
- AWS SDK v3
- Azure SDK
- JWT Authentication

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- AWS Account (optional)
- Azure Account (optional)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

## 🔑 Environment Variables

### Backend (.env)
```
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
ENCRYPTION_KEY="your-encryption-key"
SENDGRID_API_KEY="your-sendgrid-key"
FRONTEND_URL="http://localhost:5173"
```

### Frontend (.env)
```
VITE_API_URL="http://localhost:3000"
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel
```

### Backend (Railway)
1. Connect GitHub repository
2. Add environment variables
3. Deploy

## 📸 Screenshots

[Add screenshots here]

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📄 License

MIT License

## 👨‍💻 Author

Naveen Kumar
- GitHub: [@naveenrishi](https://github.com/naveenrishi)
- Email: naveenkumarpalanisammy@gmail.com

## 🙏 Acknowledgments

- AWS SDK Documentation
- Azure Documentation
- Anthropic Claude for development assistance
# CloudGaurdPro
