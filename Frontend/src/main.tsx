import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { App } from './app/App'
import { AuthProvider } from './app/AuthProvider'
import './styles.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: false } } })

createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></QueryClientProvider></StrictMode>)

