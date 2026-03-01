import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import CreateAssessmentPage from './pages/CreateAssessmentPage'
import EditAssessmentPage from './pages/EditAssessmentPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="create" element={<CreateAssessmentPage />} />
        <Route path="edit/:id" element={<EditAssessmentPage />} />
      </Route>
    </Routes>
  )
}
