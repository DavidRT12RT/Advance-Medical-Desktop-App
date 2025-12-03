import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Paciente } from "../types/Paciente";

interface PacientesState {
  loading: boolean;
  openDrawer: boolean;
  openModalConsultas: boolean;
  openModal: boolean;
  mode: "view" | "create" | "edit";
  listaDePacientes: Paciente[];
  detalleDePaciente: Paciente | null;
  error: string | null;
  refresh: number | boolean;
}

const initialState: PacientesState = {
  loading: false,
  openDrawer: false,
  openModalConsultas: false,
  openModal: false,
  mode: "view",
  listaDePacientes: [],
  detalleDePaciente: null,
  error: null,
  refresh: false,
};

export const pacientesSlice = createSlice({
  name: "pacientes",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setOpenDrawer: (state, action: PayloadAction<boolean>) => {
      state.openDrawer = action.payload;
    },
    setOpenModal: (state, action: PayloadAction<boolean>) => {
      state.openModal = action.payload;
    },
    setOpenModalConsultas: (state, action: PayloadAction<boolean>) => {
      state.openModalConsultas = action.payload;
    },
    setListaDePacientes: (state, action: PayloadAction<Paciente[]>) => {
      state.listaDePacientes = action.payload;
      state.error = null;
    },
    setDetalleDePaciente: (state, action: PayloadAction<Paciente | null>) => {
      state.detalleDePaciente = action.payload;
    },
    agregarPaciente: (state, action: PayloadAction<Paciente>) => {
      state.listaDePacientes.push(action.payload);
    },
    actualizarPacienteEnLista: (state, action: PayloadAction<Paciente>) => {
      const index = state.listaDePacientes.findIndex(
        (p) => p.id === action.payload.id
      );
      if (index !== -1) {
        state.listaDePacientes[index] = action.payload;
      }
    },
    eliminarPacienteDelista: (state, action: PayloadAction<string>) => {
      state.listaDePacientes = state.listaDePacientes.filter(
        (p) => p.id !== action.payload
      );
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setMode: (state, action: PayloadAction<"view" | "create" | "edit">) => {
      state.mode = action.payload;
    },
    setRefresh: (state, action: PayloadAction<number | boolean>) => {
      state.refresh = action.payload;
    },
  },
});

export const {
  setLoading,
  setOpenDrawer,
  setOpenModal,
  setOpenModalConsultas,
  setListaDePacientes,
  setDetalleDePaciente,
  agregarPaciente,
  actualizarPacienteEnLista,
  eliminarPacienteDelista,
  setError,
  setMode,
  setRefresh,
} = pacientesSlice.actions;

export default pacientesSlice.reducer;
