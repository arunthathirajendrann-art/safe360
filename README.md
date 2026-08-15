# Safe360

A comprehensive emergency response and incident management platform with real-time voice communication, risk assessment, and emergency contact escalation capabilities.

## 📋 Overview

Safe360 is a multi-platform emergency management system designed to provide rapid incident detection, assessment, and response coordination. The platform consists of three main components:

- **Backend** - Node.js/Express API server with incident management, voice orchestration, and real-time services
- **Dashboard** - React/Vite web application for monitoring incidents and managing responders
- **Mobile** - Flutter app for on-the-ground emergency response and check-ins

## 🏗️ Architecture

### Backend (`/backend`)
The core API server providing:
- **Incident Management** - Create, track, and manage emergency incidents
- **Authentication & Authorization** - User authentication and role-based access control
- **Voice Communication** - Twilio integration for emergency calls and voice instructions
- **Escalation Engine** - Intelligent contact escalation and notification routing
- **Risk Assessment** - Dynamic risk evaluation and incident prioritization
- **Real-time Updates** - Server-sent events (SSE) for live incident status
- **Check-in Services** - Track user safety through check-in sessions
- **LLM Integration** - AI-powered incident analysis and recommendations

**Key Services:**
- `authController` - User authentication and authorization
- `incidentController` - Incident CRUD operations
- `twilioVoiceCallbackController` - Voice call handling
- `escalationEngine` - Smart contact escalation logic
- `incidentEngine` - Incident processing and risk calculation
- `voiceAssistantService` - Voice-based incident guidance
- `sseService` - Real-time notification delivery
- `checkInService` - User check-in management

### Dashboard (`/dashboard`)
React-based web interface for:
- **Incident Monitoring** - Real-time view of active incidents
- **Analytics & Reports** - Incident statistics and response metrics
- **Responder Management** - Track and coordinate emergency responders
- **Settings & Configuration** - System administration
- **User Authentication** - Secure login and session management

**Pages:**
- `OverviewPage` - Dashboard home with key metrics
- `IncidentsPage` - Incident tracking and management
- `AnalyticsPage` - Statistical analysis and reporting
- `RespondersPage` - Responder coordination
- `SettingsPage` - System configuration

### Mobile (`/mobile`)
Flutter application for:
- **Emergency Response** - On-site incident response interface
- **Voice Guidance** - Real-time voice instructions during incidents
- **Location Services** - GPS tracking and geolocation
- **Check-in System** - User safety confirmations
- **Offline Support** - Core functionality available offline
- **Push Notifications** - Real-time incident alerts

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Flutter (v3.0+)
- npm or yarn
- Android SDK / Xcode (for mobile development)

### Backend Setup

```bash
cd backend
npm install
npm start
```

The backend server will start on `http://localhost:3000` by default.

**Environment Variables:**
- `PORT` - API server port (default: 3000)
- `DATABASE_URL` - Database connection string
- `TWILIO_ACCOUNT_SID` - Twilio account ID
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Twilio phone number
- `JWT_SECRET` - JWT signing secret

### Dashboard Setup

```bash
cd dashboard
npm install
npm run dev
```

The dashboard will run on `http://localhost:5173` by default.

**Build for Production:**
```bash
npm run build
```

### Mobile Setup

```bash
cd mobile
flutter pub get
flutter run
```

**Run on Specific Device:**
```bash
flutter run -d emulator-5554  # Android emulator
flutter run -d ios           # iOS simulator
```

## 📁 Project Structure

```
safe360/
├── backend/                  # Node.js API server
│   ├── controllers/         # Request handlers
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── middleware/          # Express middleware
│   └── server/              # Server configuration
├── dashboard/               # React web dashboard
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
└── mobile/                  # Flutter mobile app
    ├── lib/
    │   ├── models/          # Data models
    │   ├── screens/         # UI screens
    │   └── services/        # Business logic
    ├── android/             # Android configuration
    ├── ios/                 # iOS configuration
    └── web/                 # Web build configuration
```

## 🔑 Key Features

### Incident Management
- Real-time incident creation and tracking
- Automated risk assessment
- Multi-stage escalation workflow
- Comprehensive incident history

### Communication
- Twilio integration for voice calls
- AI-powered voice assistance
- SMS notifications
- Push notifications to mobile devices
- Real-time SSE updates

### User Management
- Role-based access control
- User authentication with JWT
- Emergency contact management
- Responder coordination

### Analytics & Reporting
- Incident statistics and trends
- Response time metrics
- Risk assessment reports
- Historical data analysis

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Incidents
- `GET /api/incidents` - List all incidents
- `POST /api/incidents` - Create new incident
- `GET /api/incidents/:id` - Get incident details
- `PUT /api/incidents/:id` - Update incident
- `DELETE /api/incidents/:id` - Delete incident

### Contacts
- `GET /api/contacts` - List emergency contacts
- `POST /api/contacts` - Add emergency contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Voice
- `POST /api/voice/call` - Initiate voice call
- `POST /api/voice/callback` - Handle call callbacks

### Check-in
- `POST /api/check-in/start` - Start check-in session
- `POST /api/check-in/:id/confirm` - Confirm check-in

## 🧪 Testing

### Backend
```bash
cd backend
npm test
```

### Dashboard
```bash
cd dashboard
npm test
```

### Mobile
```bash
cd mobile
flutter test
```

## 📦 Dependencies Overview

### Backend
- **Express** - Web framework
- **Twilio** - Voice/SMS services
- **JWT** - Authentication tokens
- **Database** - [Specify your DB]
- **LLM** - Language model integration

### Dashboard
- **React** - UI library
- **Vite** - Build tool
- **Axios** - HTTP client
- **Chart.js** - Data visualization

### Mobile
- **Flutter** - Mobile framework
- **Geolocator** - Location services
- **Speech to Text** - Voice input
- **Flutter TTS** - Text-to-speech
- **Package Info** - App information

## 🔐 Security Considerations

- All API endpoints require authentication (JWT tokens)
- Sensitive data is encrypted in transit (HTTPS)
- Database credentials should be stored in environment variables
- Regular security audits recommended
- CORS configured for allowed origins
- Input validation on all API endpoints

## 🚦 Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes across relevant components
3. Test your changes locally
4. Commit with clear messages: `git commit -m "feat: description"`
5. Push to remote: `git push origin feature/your-feature`
6. Create a pull request for review

## 📊 Monitoring & Logging

The system includes comprehensive logging for:
- Incident events
- API requests/responses
- Voice call activities
- Escalation triggers
- System errors

Check logs in the backend `/logs` directory for debugging.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Write tests for new features
5. Submit a pull request

## 📝 License

[Specify your license here]

## 👥 Support

For issues, questions, or suggestions:
- Create an issue in the repository
- Contact the development team
- Check existing documentation

## 🎯 Roadmap

- [ ] Enhanced analytics dashboard
- [ ] Multi-language support
- [ ] Advanced AI recommendations
- [ ] Mobile offline-first capabilities
- [ ] Integration with emergency services
- [ ] Advanced reporting features

## 📞 Contact

For more information about Safe360, please reach out to the development team.

---

**Last Updated:** August 2026
