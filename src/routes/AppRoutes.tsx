import React from "react";
import { Routes, Route } from "react-router-dom";

// Layout
import LayoutMain from "../components/LayoutMain";

// Pages
import Home from "../pages/Home";
import Doctores from "../pages/Doctores";
import Pacientes from "../pages/Pacientes";
import Configuracion from "../pages/Configuracion";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<LayoutMain />}>
        {/* <Route path="/" element={<Home />} /> */}
        {/* <Route path="/" element={<Doctores />} /> */}
        {/* <Route path="/" element={<Pacientes />} /> */}
        {/* <Route path="/pacientes" element={<Patients />} /> */}
        <Route path="/" element={<Configuracion />} />
      </Route>

    </Routes>
  );
};

export default AppRoutes;
