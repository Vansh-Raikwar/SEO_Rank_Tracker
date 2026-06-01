# SEO Rank Tracker

![SEO Rank Tracker](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

**SEO Rank Tracker** is an advanced, AI-powered SEO analysis and tracking tool. It provides instant SEO audits, performance scoring, keyword tracking, and actionable recommendations to help you optimize any website and outrank your competition.

---

## 🚀 Key Features

- **Instant SEO Audits:** Enter any URL to get a comprehensive breakdown of the site's SEO health.
- **AI-Powered Insights:** Leverages Gemini AI to provide smart, actionable recommendations for improving rankings.
- **Premium UI/UX:** Built with a modern, glassmorphism-inspired design, featuring responsive layouts and a sleek dark mode.
- **Keyword Tracking:** Monitor specific keywords and see how they perform over time.
- **Performance Scoring:** Get an at-a-glance score for accessibility, best practices, and overall SEO performance.
- **Automated Reporting:** Schedule recurring audits and receive email reports (via NodeMailer/Cron jobs).

---

## 🛠️ Technology Stack

This project is structured as a full-stack monorepo with separate client and server directories.

### Frontend (Client)
- **Framework:** [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (v4) with custom premium UI aesthetics
- **Icons:** Lucide React & Simple Icons
- **Routing:** React Router DOM

### Backend (Server)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **AI Integration:** Google Gemini AI & Serper API
- **Task Scheduling:** Node Cron
- **Authentication:** JWT-based auth

---

## 📂 Project Structure

```text
SEO_Rank_Tracker/
├── client/                 # Frontend React/Vite application
│   ├── public/             # Static assets
│   ├── src/                # React components, pages, and context
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application routes/pages
│   │   └── index.css       # Global styles & Tailwind configuration
│   └── package.json        # Frontend dependencies
├── server/                 # Backend Node/Express application
│   ├── config/             # DB & Mailer configurations
│   ├── controllers/        # Route controllers
│   ├── models/             # Mongoose schemas
│   ├── router/             # Express API routes
│   ├── services/           # External API & business logic services
│   └── server.js           # Express entry point
└── README.md               # Project documentation
```

---

## 🚦 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/en/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or yarn
- [Git](https://git-scm.com/)
- A [MongoDB](https://www.mongodb.com/) Database URI (Atlas or Local)

### 1. Clone the Repository

```bash
git clone https://github.com/Vansh-Raikwar/SEO_Rank_Tracker.git
cd SEO_Rank_Tracker
```

### 2. Environment Variables

You will need to set up `.env` files in both the `client` and `server` directories. 

**Server (`server/.env`):**
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
SMTP_SENDER=your_email@example.com
SMTP_PASSWORD=your_email_password
GEMINI_API_KEY=your_gemini_api_key
SERPER_API_KEY=your_serper_api_key
```

**Client (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Installation & Running Locally

You will need to run the client and the server concurrently in two separate terminal windows.

#### Start the Server
```bash
cd server
npm install
npm start
```
*The server will typically start on `http://localhost:5000`.*

#### Start the Client
```bash
cd client
npm install
npm run dev
```
*The client will start on the port provided by Vite (usually `http://localhost:5173`).*

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check out the [issues page](https://github.com/Vansh-Raikwar/SEO_Rank_Tracker/issues) if you want to contribute.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE.md).
