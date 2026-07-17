import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebaseConfig";

class FirebaseMedia {
  async subirFrameDeConsulta(
    empresaId: string,
    pacienteId: string,
    consultaId: string,
    sessionId: string,
    frameIndex: number,
    blob: Blob
  ): Promise<string> {
    const path = `empresas/${empresaId}/pacientes/${pacienteId}/consultas/${consultaId}/sesiones/${sessionId}/frames/frame_${frameIndex}_${Date.now()}.jpg`;
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, blob, {
      contentType: "image/jpeg",
    });
    const url = await getDownloadURL(snapshot.ref);
    return url;
  }

  async subirVideoDeConsulta(
    empresaId: string,
    pacienteId: string,
    consultaId: string,
    sessionId: string,
    blob: Blob
  ): Promise<string> {
    const path = `empresas/${empresaId}/pacientes/${pacienteId}/consultas/${consultaId}/sesiones/${sessionId}/videos/consulta_${Date.now()}.webm`;
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, blob, {
      contentType: "video/webm",
    });
    const url = await getDownloadURL(snapshot.ref);
    return url;
  }

  async subirFrameDeEstudio(
    empresaId: string,
    pacienteId: string,
    estudioId: string,
    sessionId: string,
    frameIndex: number,
    blob: Blob
  ): Promise<string> {
    const path = `empresas/${empresaId}/pacientes/${pacienteId}/estudios/${estudioId}/sesiones/${sessionId}/frames/frame_${frameIndex}_${Date.now()}.jpg`;
    const fileRef = ref(storage, path);
    const snapshot = await uploadBytes(fileRef, blob, {
      contentType: "image/jpeg",
    });
    const url = await getDownloadURL(snapshot.ref);
    return url;
  }

  async subirVideoDeEstudio(
    empresaId: string,
    pacienteId: string,
    estudioId: string,
    sessionId: string,
    blob: Blob,
    onProgress?: (percent: number) => void
  ): Promise<string> {
    const path = `empresas/${empresaId}/pacientes/${pacienteId}/estudios/${estudioId}/sesiones/${sessionId}/videos/estudio_${Date.now()}.webm`;
    const fileRef = ref(storage, path);
    // Subida resumable para poder reportar el progreso a la UI
    const task = uploadBytesResumable(fileRef, blob, {
      contentType: "video/webm",
    });
    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
          }
        },
        reject,
        () => resolve()
      );
    });
    const url = await getDownloadURL(task.snapshot.ref);
    return url;
  }
}

export default new FirebaseMedia();
