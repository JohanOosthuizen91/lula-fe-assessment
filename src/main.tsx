import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { App } from './App.tsx'
import { createQueryClient } from './api/queries.ts'
import './styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

const queryClient = createQueryClient()

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
