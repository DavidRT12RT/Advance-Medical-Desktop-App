import { configureStore } from "@reduxjs/toolkit";

// Slices
import { pacientesSlice } from "./store/pacientesSlice";
import aiReducer from "./store/aiSlice";

export const store = configureStore({
  reducer: {
    pacientes: pacientesSlice.reducer,
    ai: aiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
