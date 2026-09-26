import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Planning from './pages/Planning.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Aide, { Tarifs } from './pages/Aide.jsx'
import Coach from './pages/Coach.jsx'
import { Abonnements, MesReservations, Notifications } from './pages/Client.jsx'
import Installer from './pages/Installer.jsx'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/installer" element={<Installer />} />
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/planning" element={<Planning />} />
              <Route path="/tarifs" element={<Tarifs />} />
              <Route path="/aide" element={<Aide />} />
              <Route path="/connexion" element={<AuthPage mode="login" />} />
              <Route path="/inscription" element={<AuthPage mode="register" />} />
              <Route path="/mes-reservations" element={<MesReservations />} />
              <Route path="/abonnements" element={<Abonnements />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </>
  )
}
