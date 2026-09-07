import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import JobMatch from './pages/JobMatch'
import Interview from './pages/Interview'
import Coding from './pages/Coding'
import Readiness from './pages/Readiness'
import CareerRoadmap from './pages/CareerRoadmap'
import Assistant from "./pages/Assistant";
import Resume from './pages/Resume'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<Dashboard />} />

      <Route path="/job-match" element={<JobMatch />} />

      <Route path="/interview" element={<Interview />} />
      <Route path="/coding" element={<Coding />} />
      <Route path="/readiness" element={<Readiness />} />
      <Route path="/career-roadmap" element={<CareerRoadmap />} />
      <Route path="/assistant" element={<Assistant />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/resume" element={<Resume />} />
    </Routes>
  )
}

export default App