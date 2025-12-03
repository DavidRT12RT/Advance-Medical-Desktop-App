import { configureStore } from "@reduxjs/toolkit";

// Slices
import { pacientesSlice } from "./store/pacientesSlice";

export const store = configureStore({
  reducer: {
    pacientes: pacientesSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
