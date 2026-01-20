import { createSlice } from "@reduxjs/toolkit";

const initialState: any = {
  loading: false,
  openDrawer: false,
  refresh: Math.random(),
  listaDocumentosRag: [],
  listaTemplatesReportes: [],
  chatSelected: null,
  chatSelectedInfo: null,
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
    setChatSelected: (state, action) => {
      console.log("Mando a llamar la funcion!");
      state.chatSelected = action.payload;
    },
    setChatSelectedInfo: (state, action) => {
      state.chatSelectedInfo = action.payload;
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
  setChatSelected,
  setChatSelectedInfo,
} = ai.actions;

export default ai.reducer;
