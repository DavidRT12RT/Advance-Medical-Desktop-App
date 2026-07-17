import React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter as Router } from "react-router"
// Hace funcionar los métodos estáticos de antd (message.*, Modal.confirm,
// notification.*) bajo React 19; sin esto fallan silenciosamente
import "@ant-design/v5-patch-for-react-19"

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

