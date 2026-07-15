import { createSlice } from "@reduxjs/toolkit";

const initialState: any = {
  loading: false,
  openDrawer: false,
  refresh: Math.random(),
  listaDocumentosRag: [],
  listaTemplatesReportes: [],
};

export const ai = createSlice({
  name: "ai",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setOpenDrawer: (state, action) => {
      state.openDrawer = action.payload;
    },
    setRefresh: (state, action) => {
      state.refresh = action.payload;
    },
    setListaDocumentosRag: (state, action) => {
      state.listaDocumentosRag = action.payload;
    },
    setListaTemplatesReportes: (state, action) => {
      state.listaTemplatesReportes = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setLoading,
  setOpenDrawer,
  setRefresh,
  setListaDocumentosRag,
  setListaTemplatesReportes,
} = ai.actions;

export default ai.reducer;
