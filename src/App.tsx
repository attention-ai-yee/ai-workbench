import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import News from './pages/News'
import Agents from './pages/Agents'
import AgentChat from './pages/AgentChat'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import { AppLayout } from './components/AppLayout'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/news" element={<News />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/agents/:id" element={<AgentChat />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
