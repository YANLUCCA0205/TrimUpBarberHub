import React from 'react'
import ReactDOM from 'react-dom/client'
import db from '@/lib/db'
globalThis.__B44_DB__ = db;

import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
