/**
 * Nombre completo de un paciente embebido en consultas/estudios.
 * Los pacientes usan nombres/apellidoPaterno/apellidoMaterno; algunos
 * registros viejos traían nombre/apellido — se aceptan ambas formas.
 */
export const nombreCompletoPaciente = (paciente: any): string =>
  [
    paciente?.nombres || paciente?.nombre,
    paciente?.apellidoPaterno || paciente?.apellido,
    paciente?.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ");
