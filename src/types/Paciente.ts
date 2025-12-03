import dayjs from "dayjs";

export interface Paciente {
  id?: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento?: string | dayjs.Dayjs | Date;
  sexo?: string;
  domicilio?: string;
  telefonoCasa?: string;
  celular?: string;
  email?: string;
  cedula?: string;
  familiarResponsable?: string;
  seguro?: string;
  antecedentesPatologicos?: string;
  antecedentesNoPatologicos?: string;
  antecedentesHeredoFamiliares?: string;
  alergias?: string;
  medicamentosActuales?: string;
  cirugiasPrevias?: string;
  activo?: boolean;
  [key: string]: any;
}
