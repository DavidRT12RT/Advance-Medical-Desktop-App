import React from "react";
import { Routes, Route } from "react-router-dom";

// Layout
import LayoutMain from "../components/LayoutMain";

// Pages
import Home from "../pages/Home";
// Agrega más páginas aquí...
// import Doctors from "../pages/Doctors";
// import Patients from "../pages/Patients";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<LayoutMain />}>
        <Route path="/" element={<Home />} />
        {/* <Route path="/doctores" element={<Doctors />} /> */}
        {/* <Route path="/pacientes" element={<Patients />} /> */}
      </Route>
    </Routes>
  );
};

export default AppRoutes;
