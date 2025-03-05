import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import App from './App.jsx'
// import App from './job.jsx'
// import App from './App2.jsx'
import App from './App3.jsx'
// import App from './FinalApp.jsx'
// import PreparationGuide from './AppSIT.jsx'
// import QuizApp from './QuizApp.jsx'
// import EnhancedJobProfileForm from './UserForm.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App/>
    {/* <PreparationGuide/> */}
    {/* <QuizApp/> */}
    {/* <EnhancedJobProfileForm/> */}
  </StrictMode>,
)
