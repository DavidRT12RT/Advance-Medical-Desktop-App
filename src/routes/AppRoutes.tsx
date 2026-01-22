import React from "react";
import { Routes, Route } from "react-router-dom";

// Layout
import LayoutMain from "../components/LayoutMain";

// Pages
import Home from "../pages/Home";
import Doctores from "../pages/Doctores";
import Pacientes from "../pages/Pacientes";
import Configuracion from "../pages/Configuracion";
import Detection from "../pages/Detection";
import Patients from "../pages/Pacientes";
import PacienteDetalle from "../pages/PacienteDetalle";
import EstudioDetalle from "../pages/EstudioDetalle";
import ConsultaDetalle from "../pages/ConsultaDetalle";
import Estudios from "../pages/Estudios";
import Consultas from "../pages/Consultas";
import ActualizacionSoftware from "../pages/ActualizacionSoftware";

//Single Page Application SPA
const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<LayoutMain />}>
        {/* <Route path="/" element={<Home />} /> */}
        {/* <Route path="/" element={<Pacientes />} /> */}
        <Route path="/" element={<Patients />} />
        <Route path="/configuracion" element={<Configuracion />} />
        <Route path="/paciente-detalle/:id" element={<PacienteDetalle />} />
        <Route path="/estudios" element={<Estudios />} />
        <Route path="/consultas" element={<Consultas />} />
        <Route
          path="/paciente-detalle/:id/estudios/:estudioId"
          element={<EstudioDetalle />}
        />
        <Route
          path="/paciente-detalle/:id/estudios/:estudioId/deteccion"
          element={<Detection />}
        />
        <Route
          path="/paciente-detalle/:id/consultas/:consultaId"
          element={<ConsultaDetalle />}
        />
        <Route path="/actualizacion" element={<ActualizacionSoftware />} />
        {/* <Route path="/" element={<Configuracion />} /> */}
        {/* <Route path="/" element={<Detection />} /> */}
      </Route>
    </Routes>
  );
};

export default AppRoutes;
