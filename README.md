# Smart Attendance System

A modern, full-stack MERN application for managing student attendance with a premium Glassmorphism UI.

## 🚀 Features

- **Teacher Authentication**: Secure registration and login using JWT (JSON Web Tokens).
- **Student Management**: Full CRUD (Create, Read, Update, Delete) operations for students.
- **Attendance Tracking**: Easily mark and update student attendance for any date.
- **CSV Report Generation**: Export attendance records to CSV for any specified date range.
- **Premium UI**: Sleek Dashboard with Glassmorphism effects, responsive design, and real-time notifications.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Notifications**: [React Toastify](https://fkhadra.github.io/react-toastify/)
- **Styling**: Vanilla CSS with custom Glassmorphism components.

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (via [Mongoose](https://mongoosejs.com/))
- **Authentication**: JWT & BcryptJS.
- **Environment**: Dotenv for configuration.

## 📦 Project Structure

```text
Attendance_system/
├── backend/            # Express API, MongoDB models, JWT middleware
├── frontend/           # React application
│   └── vite-project/   # Vite-based frontend source
└── README.md           # Project documentation
```

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas account or local MongoDB instance

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Attendance_system
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory and add:
   ```env
   MONGODB_URL=your_mongodb_connection_string
   JWT_SECRET=your_secure_jwt_secret
   PORT=5000
   ```
   *Note: See `.env.example` for reference.*

3. **Setup Frontend**:
   ```bash
   cd ../frontend/vite-project
   npm install
   ```

### Running the Application

- **Start Backend**:
  ```bash
  cd backend
  npm start
  ```
  The API will run on `http://localhost:5000`.

- **Start Frontend**:
  ```bash
  cd frontend/vite-project
  npm run dev
  ```
  The app will run on `http://localhost:5173`.

## 📄 License
Internal project. Use according to team guidelines.
# projec
