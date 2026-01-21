import React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter as Router } from "react-router"

import Root from "./Root"
import "./index.css"

const root = createRoot(document.getElementById("root"))

root.render(
  <React.StrictMode>
    <Router>
      <Root />
    </Router>
  </React.StrictMode>
)

