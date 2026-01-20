import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import ColonIllustration from "./illustrations/ColonIllustration";
import LungsIllustration from "./illustrations/LungsIllustration";
import StomachIllustration from "./illustrations/StomachIllustration";
//@ts-ignore
import logo from "../../assets/logo.png";

// Interfaces para datos dinámicos
interface OrganizacionData {
  nombreOrganizacion?: string;
  directorGeneral?: string;
  telefonoPrincipal?: string;
  emailInstitucional?: string;
  codigoRegistroSanitario?: string;
  [key: string]: any;
}

interface ConfiguracionMedicaData {
  cedula?: string;
  especialidad?: string;
  numeroRegistro?: string;
  institucionFormacion?: string;
  aniosExperiencia?: string;
  telefonoContacto?: string;
  emailProfesional?: string;
  consultorio?: string;
  [key: string]: any;
}

// Colors matching the app's design system
const COLORS = {
  indigo: "#4F46E5",
  indigoBg: "#EEF2FF",
  indigoBorder: "#C7D2FE",
  gray800: "#1f2937",
  gray700: "#374151",
  gray600: "#4b5563",
  gray500: "#6b7280",
  gray400: "#9ca3af",
  gray100: "#f3f4f6",
  gray50: "#f9fafb",
  white: "#ffffff",
  blue600: "#2563eb",
  purple600: "#9333ea",
  teal600: "#0d9488",
  green600: "#16a34a",
  orange600: "#ea580c",
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: COLORS.white,
  },
  // Header styles
  header: {
    flexDirection: "row",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.indigo,
  },
  logoContainer: {
    width: "15%",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 120,
    height: 120,
    objectFit: "contain",
  },
  headerCenter: {
    width: "70%",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.indigo,
    textAlign: "center",
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.indigo,
    textAlign: "center",
    marginBottom: 2,
  },
  headerAddress: {
    fontSize: 8,
    color: COLORS.gray600,
    textAlign: "center",
  },
  anatomyContainer: {
    width: "15%",
    alignItems: "center",
    justifyContent: "center",
  },
  // Section card styles (matching app's bg-white p-6 rounded-xl shadow-sm border border-gray-100)
  sectionCard: {
    backgroundColor: COLORS.white,
    padding: 14,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  // Section title with left border (matching app's border-l-4 border-indigo-600)
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.indigo,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: COLORS.gray800,
  },
  // Grid layouts
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridItem2: {
    width: "50%",
    paddingRight: 8,
    marginBottom: 6,
  },
  gridItem3: {
    width: "33.33%",
    paddingRight: 8,
    marginBottom: 6,
  },
  gridItemFull: {
    width: "100%",
    marginBottom: 6,
  },
  // Field styles
  fieldLabel: {
    fontSize: 8,
    color: COLORS.gray500,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 9,
    color: COLORS.gray800,
  },
  fieldValueLarge: {
    fontSize: 9,
    color: COLORS.gray700,
    lineHeight: 1.5,
    textAlign: "justify",
  },
  // Highlighted section (matching app's bg-indigo-50/50 p-5 rounded-lg border border-indigo-100)
  highlightedSection: {
    backgroundColor: COLORS.indigoBg,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.indigoBorder,
  },
  // Images section
  imagesSection: {
    marginBottom: 12,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  imageWrapper: {
    width: "24%",
    marginRight: "1%",
    marginBottom: 6,
  },
  studyImage: {
    width: "100%",
    height: 70,
    objectFit: "cover",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  imageTitle: {
    fontSize: 7,
    color: COLORS.gray700,
    textAlign: "center",
    marginTop: 2,
  },
  // AI Section
  aiSection: {
    backgroundColor: COLORS.indigoBg,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.indigo,
  },
  aiTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.indigo,
    marginBottom: 6,
  },
  aiContent: {
    fontSize: 9,
    color: COLORS.gray700,
    lineHeight: 1.4,
  },
  // Signature section - NOT absolute positioned, flows with content
  signaturesContainer: {
    marginTop: 30,
    paddingTop: 20,
  },
  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
  },
  signatureBlock: {
    alignItems: "center",
    width: "30%",
    marginBottom: 20,
  },
  signatureLine: {
    width: 140,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray800,
    marginBottom: 4,
  },
  signatureName: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.gray800,
    textAlign: "center",
  },
  signatureRole: {
    fontSize: 8,
    color: COLORS.gray600,
    textAlign: "center",
  },
  signatureCedula: {
    fontSize: 7,
    color: COLORS.gray500,
    textAlign: "center",
  },
  // Footer
  footer: {
    marginTop: 20,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: COLORS.gray400,
  },
  // Patient info compact
  patientInfoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  patientLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: COLORS.gray700,
    width: 110,
  },
  patientValue: {
    fontSize: 9,
    color: COLORS.gray800,
    flex: 1,
  },
});

// Get anatomical illustration based on procedure type
const getAnatomyIllustration = (tipo: string) => {
  const tipoLower = (tipo || "").toLowerCase();

  if (tipoLower.includes("colon") || tipoLower.includes("colonoscopia")) {
    return <ColonIllustration />;
  }
  if (
    tipoLower.includes("bronco") ||
    tipoLower.includes("pulmon") ||
    tipoLower.includes("pulmón")
  ) {
    return <LungsIllustration />;
  }
  if (
    tipoLower.includes("gastro") ||
    tipoLower.includes("endoscopia") ||
    tipoLower.includes("endoscopía") ||
    tipoLower.includes("estomago") ||
    tipoLower.includes("estómago")
  ) {
    return <StomachIllustration />;
  }
  return <ColonIllustration />;
};

export interface ImagenSeleccionada {
  url: string;
  titulo: string;
}

export interface ReportConfig {
  incluirDatosClinica: boolean;
  incluirDatosMedico: boolean;
  incluirDatosAnestesiologo: boolean;
  incluirDatosAsistente: boolean;
  incluirDatosPaciente: boolean;
  incluirResultado: boolean;
  incluirHallazgos: boolean;
  incluirPolipos: boolean;
  incluirMedicamentos: boolean;
  incluirComplicaciones: boolean;
  incluirSeguimiento: boolean;
  incluirSedacion: boolean;
  incluirEquipo: boolean;
  incluirAnalisisIA: boolean;
  imagenesSeleccionadas: ImagenSeleccionada[];
}

interface ReportePDFDocumentProps {
  estudio: any;
  paciente: any;
  config: ReportConfig;
  organizacion?: OrganizacionData;
  configuracionMedica?: ConfiguracionMedicaData;
  nombreDoctor?: string;
}

const ReportePDFDocument: React.FC<ReportePDFDocumentProps> = ({
  estudio,
  paciente,
  config,
  organizacion,
  configuracionMedica,
  nombreDoctor,
}) => {
  const fechaEstudio = estudio?.fecha || "No especificada";
  const tipoEstudio = estudio?.tipo || "Estudio";

  const nombrePaciente = paciente
    ? [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno]
        .filter(Boolean)
        .join(" ")
    : "No especificado";

  const aiSessions = Array.isArray(estudio?.secciones_ai)
    ? estudio.secciones_ai
    : [];
  const lastSession = aiSessions.length
    ? aiSessions[aiSessions.length - 1]
    : null;

  // Limit images to max 10
  const imagesToShow: ImagenSeleccionada[] = config.imagenesSeleccionadas.slice(
    0,
    10
  );

  // Calculate patient age if birth date exists
  const calcularEdad = (fechaNac: string) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const edadPaciente = paciente?.fechaNacimiento
    ? calcularEdad(paciente.fechaNacimiento)
    : null;

  // Helper component for section title with left border
  const SectionTitle = ({ title }: { title: string }) => (
    <View style={styles.sectionTitleContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* Header with Logo, Title, and Anatomy */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src={logo} style={styles.logo} />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>INFORME DEL ESTUDIO</Text>
            {organizacion?.nombreOrganizacion && (
              <Text style={styles.headerSubtitle}>
                {organizacion.nombreOrganizacion}
              </Text>
            )}
            {organizacion?.directorGeneral && (
              <Text style={styles.headerSubtitle}>
                Director: {organizacion.directorGeneral}
              </Text>
            )}
            {organizacion?.telefonoPrincipal && (
              <Text style={styles.headerAddress}>
                Tel: {organizacion.telefonoPrincipal}
              </Text>
            )}
            {organizacion?.emailInstitucional && (
              <Text style={styles.headerAddress}>
                {organizacion.emailInstitucional}
              </Text>
            )}
          </View>
          <View style={styles.anatomyContainer}>
            {getAnatomyIllustration(tipoEstudio)}
          </View>
        </View>

        {/* Section 1: Patient Data */}
        {config.incluirDatosPaciente && paciente && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Datos del Paciente" />
            <View style={styles.gridRow}>
              <View style={styles.gridItem2}>
                <Text style={styles.fieldLabel}>Nombre completo</Text>
                <Text style={styles.fieldValue}>{nombrePaciente}</Text>
              </View>
              {edadPaciente && (
                <View style={styles.gridItem3}>
                  <Text style={styles.fieldLabel}>Edad</Text>
                  <Text style={styles.fieldValue}>{edadPaciente} Años</Text>
                </View>
              )}
              {paciente.sexo && (
                <View style={styles.gridItem3}>
                  <Text style={styles.fieldLabel}>Sexo</Text>
                  <Text style={styles.fieldValue}>{paciente.sexo}</Text>
                </View>
              )}
              {paciente.fechaNacimiento && (
                <View style={styles.gridItem3}>
                  <Text style={styles.fieldLabel}>Fecha de Nacimiento</Text>
                  <Text style={styles.fieldValue}>
                    {paciente.fechaNacimiento}
                  </Text>
                </View>
              )}
              <View style={styles.gridItem2}>
                <Text style={styles.fieldLabel}>Fecha del Estudio</Text>
                <Text style={styles.fieldValue}>{fechaEstudio}</Text>
              </View>
              <View style={styles.gridItem2}>
                <Text style={styles.fieldLabel}>Procedimiento</Text>
                <Text style={styles.fieldValue}>{tipoEstudio}</Text>
              </View>
            </View>
          </View>
        )}

        {/* IMAGES SECTION - Prominent placement */}
        {imagesToShow.length > 0 && (
          <View style={styles.sectionCard}>
            <SectionTitle title="Imágenes del Estudio" />
            <View style={styles.imagesGrid}>
              {imagesToShow.map((img, idx) => (
                <View key={idx} style={styles.imageWrapper}>
                  <Image src={img.url} style={styles.studyImage} />
                  {img.titulo && (
                    <Text style={styles.imageTitle}>{img.titulo}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section 2: Clinical Information and Findings */}
        {(config.incluirHallazgos || config.incluirResultado) && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Información Clínica y Hallazgos" />
            {config.incluirResultado && estudio?.resultado && (
              <View style={styles.gridItemFull}>
                <Text style={styles.fieldLabel}>Resultado general</Text>
                <Text style={styles.fieldValueLarge}>{estudio.resultado}</Text>
              </View>
            )}
            {config.incluirHallazgos && estudio?.hallazgos && (
              <View style={styles.gridItemFull}>
                <Text style={styles.fieldLabel}>Hallazgos generales</Text>
                <Text style={styles.fieldValueLarge}>{estudio.hallazgos}</Text>
              </View>
            )}
            {estudio?.observaciones && (
              <View style={styles.gridItemFull}>
                <Text style={styles.fieldLabel}>Observaciones</Text>
                <Text style={styles.fieldValueLarge}>
                  {estudio.observaciones}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Section 3: Polyp/Lesion Details */}
        {config.incluirPolipos &&
          (estudio?.polipo || estudio?.tamano || estudio?.ubicacion) && (
            <View style={styles.sectionCard} wrap={false}>
              <SectionTitle title="Detalle de Lesiones / Pólipos" />
              <View style={styles.highlightedSection}>
                <View style={styles.gridRow}>
                  {estudio.polipo && (
                    <View style={styles.gridItem3}>
                      <Text style={styles.fieldLabel}>Tipo / Morfología</Text>
                      <Text style={styles.fieldValue}>{estudio.polipo}</Text>
                    </View>
                  )}
                  {estudio.tamano && (
                    <View style={styles.gridItem3}>
                      <Text style={styles.fieldLabel}>Tamaño</Text>
                      <Text style={styles.fieldValue}>{estudio.tamano} mm</Text>
                    </View>
                  )}
                  {estudio.ubicacion && (
                    <View style={styles.gridItem3}>
                      <Text style={styles.fieldLabel}>Ubicación</Text>
                      <Text style={styles.fieldValue}>{estudio.ubicacion}</Text>
                    </View>
                  )}
                  {estudio.clasificacion && (
                    <View style={styles.gridItem3}>
                      <Text style={styles.fieldLabel}>
                        Clasificación (NICE/JNET)
                      </Text>
                      <Text style={styles.fieldValue}>
                        {estudio.clasificacion}
                      </Text>
                    </View>
                  )}
                  {estudio.accion && (
                    <View style={styles.gridItem3}>
                      <Text style={styles.fieldLabel}>Acción terapéutica</Text>
                      <Text style={styles.fieldValue}>{estudio.accion}</Text>
                    </View>
                  )}
                  {estudio.biopsia && (
                    <View style={styles.gridItem3}>
                      <Text style={styles.fieldLabel}>¿Se tomó biopsia?</Text>
                      <Text style={styles.fieldValue}>{estudio.biopsia}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

        {/* Section 4: Plan and Follow-up */}
        {(config.incluirMedicamentos ||
          config.incluirComplicaciones ||
          config.incluirSeguimiento) && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Plan y Seguimiento" />
            <View style={styles.gridRow}>
              {config.incluirMedicamentos && estudio?.medicamentos && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Medicamentos utilizados</Text>
                  <Text style={styles.fieldValue}>{estudio.medicamentos}</Text>
                </View>
              )}
              {config.incluirComplicaciones && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Complicaciones</Text>
                  <Text style={styles.fieldValue}>
                    {estudio?.complicaciones || "Ninguna"}
                  </Text>
                </View>
              )}
              {config.incluirSeguimiento && estudio?.seguimiento && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>
                    Fecha sugerida próximo control
                  </Text>
                  <Text style={styles.fieldValue}>{estudio.seguimiento}</Text>
                </View>
              )}
              {estudio?.intervaloSeguimiento && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Intervalo sugerido</Text>
                  <Text style={styles.fieldValue}>
                    {estudio.intervaloSeguimiento}
                  </Text>
                </View>
              )}
              {estudio?.tolerancia && (
                <View style={styles.gridItemFull}>
                  <Text style={styles.fieldLabel}>Tolerancia del paciente</Text>
                  <Text style={styles.fieldValue}>{estudio.tolerancia}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Section 5: Sedation Method */}
        {config.incluirSedacion && estudio?.metodo_sedacion && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Método de Sedación" />
            <View style={styles.gridRow}>
              <View style={styles.gridItem2}>
                <Text style={styles.fieldLabel}>Tipo de sedación</Text>
                <Text style={styles.fieldValue}>{estudio.metodo_sedacion}</Text>
              </View>
              {estudio.sedacion_dosis && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Dosis administrada</Text>
                  <Text style={styles.fieldValue}>
                    {estudio.sedacion_dosis}
                  </Text>
                </View>
              )}
              {estudio.sedacion_observaciones && (
                <View style={styles.gridItemFull}>
                  <Text style={styles.fieldLabel}>
                    Observaciones de sedación
                  </Text>
                  <Text style={styles.fieldValue}>
                    {estudio.sedacion_observaciones}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Section 6: Equipment Used */}
        {config.incluirEquipo && estudio?.equipo_endoscopio && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Equipo Utilizado" />
            <View style={styles.gridRow}>
              <View style={styles.gridItem2}>
                <Text style={styles.fieldLabel}>Tipo de endoscopio</Text>
                <Text style={styles.fieldValue}>
                  {estudio.equipo_endoscopio}
                </Text>
              </View>
              {estudio.equipo_marca && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Marca</Text>
                  <Text style={styles.fieldValue}>{estudio.equipo_marca}</Text>
                </View>
              )}
              {estudio.equipo_modelo && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Modelo</Text>
                  <Text style={styles.fieldValue}>{estudio.equipo_modelo}</Text>
                </View>
              )}
              {estudio.equipo_serie && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Número de serie</Text>
                  <Text style={styles.fieldValue}>{estudio.equipo_serie}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Section 7: Clinic/Hospital Info */}
        {config.incluirDatosClinica && estudio?.clinica_nombre && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Consultorio / Clínica" />
            <View style={styles.gridRow}>
              <View style={styles.gridItem2}>
                <Text style={styles.fieldLabel}>
                  Nombre del establecimiento
                </Text>
                <Text style={styles.fieldValue}>{estudio.clinica_nombre}</Text>
              </View>
              {estudio.clinica_numero && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>
                    Número de consultorio / sala
                  </Text>
                  <Text style={styles.fieldValue}>
                    {estudio.clinica_numero}
                  </Text>
                </View>
              )}
              {estudio.clinica_direccion && (
                <View style={styles.gridItemFull}>
                  <Text style={styles.fieldLabel}>Dirección</Text>
                  <Text style={styles.fieldValue}>
                    {estudio.clinica_direccion}
                  </Text>
                </View>
              )}
              {estudio.clinica_telefono && (
                <View style={styles.gridItem2}>
                  <Text style={styles.fieldLabel}>Teléfono</Text>
                  <Text style={styles.fieldValue}>
                    {estudio.clinica_telefono}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* AI Analysis */}
        {config.incluirAnalisisIA && lastSession && (
          <View style={styles.sectionCard} wrap={false}>
            <SectionTitle title="Análisis Asistido por IA" />
            <View style={styles.aiSection}>
              {lastSession.ia_cnn?.summary && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.aiTitle}>Detección CNN</Text>
                  <Text style={styles.aiContent}>
                    Segmentos detectados:{" "}
                    {lastSession.ia_cnn.summary.totalSegments || 0}
                    {" · "}
                    Eventos de pólipos:{" "}
                    {lastSession.ia_cnn.summary.totalPolypEvents || 0}
                  </Text>
                </View>
              )}
              {lastSession.ia_llm && (
                <View>
                  <Text style={styles.aiTitle}>Análisis LLM</Text>
                  <Text style={styles.aiContent}>
                    {lastSession.ia_llm.has_polyp
                      ? "Pólipo detectado"
                      : "Sin pólipos detectados"}
                    {lastSession.ia_llm.severity &&
                      ` · Severidad: ${lastSession.ia_llm.severity}`}
                    {lastSession.ia_llm.confidence_level &&
                      ` · Confianza: ${lastSession.ia_llm.confidence_level}`}
                  </Text>
                  {lastSession.ia_llm.description && (
                    <Text style={{ ...styles.aiContent, marginTop: 4 }}>
                      {lastSession.ia_llm.description}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* SIGNATURES - All involved personnel */}
        <View style={styles.signaturesContainer} wrap={false}>
          <View style={styles.signaturesRow}>
            {/* Doctor signature */}
            {config.incluirDatosMedico && (
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureName}>
                  {(
                    nombreDoctor ||
                    estudio?.medico_nombre ||
                    "MÉDICO TRATANTE"
                  ).toUpperCase()}
                </Text>
                <Text style={styles.signatureRole}>Médico Tratante</Text>
                {(configuracionMedica?.cedula || estudio?.medico_cedula) && (
                  <Text style={styles.signatureCedula}>
                    Céd. Prof.{" "}
                    {configuracionMedica?.cedula || estudio.medico_cedula}
                  </Text>
                )}
                {(configuracionMedica?.especialidad ||
                  estudio?.medico_especialidad) && (
                  <Text style={styles.signatureCedula}>
                    {configuracionMedica?.especialidad ||
                      estudio.medico_especialidad}
                  </Text>
                )}
                {configuracionMedica?.numeroRegistro && (
                  <Text style={styles.signatureCedula}>
                    Reg. {configuracionMedica.numeroRegistro}
                  </Text>
                )}
              </View>
            )}

            {/* Anesthesiologist signature */}
            {config.incluirDatosAnestesiologo &&
              estudio?.anestesiologo_nombre && (
                <View style={styles.signatureBlock}>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureName}>
                    {(
                      estudio?.anestesiologo_nombre || "ANESTESIÓLOGO"
                    ).toUpperCase()}
                  </Text>
                  <Text style={styles.signatureRole}>Anestesiólogo</Text>
                  {estudio?.anestesiologo_cedula && (
                    <Text style={styles.signatureCedula}>
                      Céd. Prof. {estudio.anestesiologo_cedula}
                    </Text>
                  )}
                  {estudio?.anestesiologo_especialidad && (
                    <Text style={styles.signatureCedula}>
                      {estudio.anestesiologo_especialidad}
                    </Text>
                  )}
                </View>
              )}

            {/* Assistant/Nurse signature */}
            {config.incluirDatosAsistente && estudio?.asistente_nombre && (
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureName}>
                  {estudio.asistente_nombre.toUpperCase()}
                </Text>
                <Text style={styles.signatureRole}>
                  {estudio?.asistente_rol || "Asistente / Enfermero(a)"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Generado el {new Date().toLocaleDateString("es-MX")}
          </Text>
          <Text style={styles.footerText}>
            Advance Medical - Sistema de Gestión Médica
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReportePDFDocument;
