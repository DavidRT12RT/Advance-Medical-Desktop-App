import React from "react";
import {
  Svg,
  Path,
  Circle,
  Ellipse,
  G,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
} from "@react-pdf/renderer";

/**
 * Ilustración anatómica detallada de los pulmones para reportes PDF
 * Incluye tráquea, bronquios, lóbulos pulmonares, fisuras y estructuras vasculares
 */
interface Props {
  /** Marcador del hallazgo: coordenadas en el viewBox 200x180 */
  marcador?: { cx: number; cy: number };
}

const LungsIllustration: React.FC<Props> = ({ marcador }) => {
  return (
    <Svg viewBox="0 0 200 180" width={90} height={81}>
      <Defs>
        {/* Gradiente para pulmones */}
        <LinearGradient id="lungGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#e8f4f8" stopOpacity="1" />
          <Stop offset="50%" stopColor="#d4e8f7" stopOpacity="1" />
          <Stop offset="100%" stopColor="#b8ddf0" stopOpacity="1" />
        </LinearGradient>

        {/* Gradiente para tráquea y bronquios */}
        <LinearGradient id="airwayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#7ab8d9" stopOpacity="1" />
          <Stop offset="50%" stopColor="#5a9fd4" stopOpacity="1" />
          <Stop offset="100%" stopColor="#4a8fc4" stopOpacity="1" />
        </LinearGradient>

        {/* Gradiente para sombras */}
        <LinearGradient id="lungShadow" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4a8fc4" stopOpacity="0.1" />
          <Stop offset="100%" stopColor="#4a8fc4" stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Tráquea */}
      <G>
        {/* Cuerpo de la tráquea */}
        <Path
          d="M100 15 L100 50"
          fill="none"
          stroke="url(#airwayGradient)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Anillos cartilaginosos traqueales */}
        <Path
          d="M96 20 L104 20 M96 26 L104 26 M96 32 L104 32 M96 38 L104 38 M96 44 L104 44"
          fill="none"
          stroke="#4a8fc4"
          strokeWidth={1.5}
          strokeLinecap="round"
        />

        {/* Membrana traqueal posterior */}
        <Path
          d="M96 15 L96 50"
          fill="none"
          stroke="#3a7fb4"
          strokeWidth={1}
          opacity="0.6"
        />

        {/* Laringe superior */}
        <Ellipse
          cx="100"
          cy="15"
          rx="6"
          ry="4"
          fill="#5a9fd4"
          stroke="#4a8fc4"
          strokeWidth={1.5}
        />
      </G>

      {/* Carina (bifurcación traqueal) */}
      <G>
        <Circle cx="100" cy="50" r="5" fill="#4a8fc4" opacity="0.3" />
        <Path
          d="M98 52 L102 52"
          stroke="#3a7fb4"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </G>

      {/* Bronquio principal derecho */}
      <G>
        <Path
          d="M100 50 Q105 55 115 65"
          fill="none"
          stroke="url(#airwayGradient)"
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Anillos bronquiales */}
        <Path
          d="M102 53 L104 54 M106 58 L108 59 M110 62 L112 63"
          fill="none"
          stroke="#4a8fc4"
          strokeWidth={1}
        />
      </G>

      {/* Bronquio principal izquierdo */}
      <G>
        <Path
          d="M100 50 Q95 55 85 65"
          fill="none"
          stroke="url(#airwayGradient)"
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Anillos bronquiales */}
        <Path
          d="M98 53 L96 54 M94 58 L92 59 M90 62 L88 63"
          fill="none"
          stroke="#4a8fc4"
          strokeWidth={1}
        />
      </G>

      {/* PULMÓN DERECHO (3 lóbulos) */}
      <G>
        {/* Contorno general del pulmón derecho */}
        <Path
          d="M115 65 Q125 60 135 65 Q145 70 150 80 Q155 95 155 110 Q155 130 150 145 Q145 155 135 160 Q125 163 115 160 Q110 158 108 150 L108 75 Q110 68 115 65 Z"
          fill="url(#lungGradient)"
          stroke="#5a9fd4"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Fisura oblicua derecha */}
        <Path
          d="M145 85 Q135 95 125 110 Q120 120 118 135"
          fill="none"
          stroke="#4a8fc4"
          strokeWidth={2}
          strokeDasharray="4,3"
          opacity="0.6"
        />

        {/* Fisura horizontal derecha */}
        <Path
          d="M140 90 Q130 92 120 90"
          fill="none"
          stroke="#4a8fc4"
          strokeWidth={2}
          strokeDasharray="4,3"
          opacity="0.6"
        />

        {/* Bronquios lobares derechos */}
        <Path
          d="M115 65 L125 75 M115 65 L120 80 M115 65 L118 90"
          fill="none"
          stroke="#6ab0e4"
          strokeWidth={3}
        />

        {/* Bronquios segmentarios derechos */}
        <Path
          d="M125 75 L132 80 M125 75 L130 85 M120 80 L125 88 M120 80 L118 90 M118 90 L122 100 M118 90 L115 105"
          fill="none"
          stroke="#8dc5ed"
          strokeWidth={1.8}
          opacity="0.7"
        />

        {/* Sombra interna para profundidad */}
        <Path
          d="M115 70 Q120 75 120 90 Q120 110 118 130 Q116 145 115 155"
          fill="none"
          stroke="url(#lungShadow)"
          strokeWidth={8}
        />

        {/* Pleura visceral (brillo) */}
        <Path
          d="M135 68 Q142 72 148 82"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          opacity="0.4"
          strokeLinecap="round"
        />
      </G>

      {/* PULMÓN IZQUIERDO (2 lóbulos) */}
      <G>
        {/* Contorno general del pulmón izquierdo */}
        <Path
          d="M85 65 Q75 60 65 65 Q55 70 50 80 Q45 95 45 110 Q45 130 50 145 Q55 155 65 160 Q75 163 85 160 Q90 158 92 150 L92 75 Q90 68 85 65 Z"
          fill="url(#lungGradient)"
          stroke="#5a9fd4"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Escotadura cardíaca (muesca para el corazón) */}
        <Path
          d="M92 120 Q95 125 95 132 Q95 138 92 142"
          fill="none"
          stroke="#5a9fd4"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d="M92 120 Q98 125 98 132 Q98 138 92 142"
          fill="#e8f4f8"
          opacity="0.5"
        />

        {/* Fisura oblicua izquierda */}
        <Path
          d="M55 85 Q65 95 75 110 Q80 120 82 135"
          fill="none"
          stroke="#4a8fc4"
          strokeWidth={2}
          strokeDasharray="4,3"
          opacity="0.6"
        />

        {/* Bronquios lobares izquierdos */}
        <Path
          d="M85 65 L75 75 M85 65 L80 80 M85 65 L82 90"
          fill="none"
          stroke="#6ab0e4"
          strokeWidth={3}
        />

        {/* Bronquios segmentarios izquierdos */}
        <Path
          d="M75 75 L68 80 M75 75 L70 85 M80 80 L75 88 M80 80 L82 90 M82 90 L78 100 M82 90 L85 105"
          fill="none"
          stroke="#8dc5ed"
          strokeWidth={1.8}
          opacity="0.7"
        />

        {/* Sombra interna para profundidad */}
        <Path
          d="M85 70 Q80 75 80 90 Q80 110 82 130 Q84 145 85 155"
          fill="none"
          stroke="url(#lungShadow)"
          strokeWidth={8}
        />

        {/* Pleura visceral (brillo) */}
        <Path
          d="M65 68 Q58 72 52 82"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
          opacity="0.4"
          strokeLinecap="round"
        />
      </G>

      {/* Vasos sanguíneos principales */}
      <G opacity="0.5">
        {/* Arteria pulmonar derecha */}
        <Path
          d="M100 50 Q108 52 115 60"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={2.5}
        />

        {/* Arteria pulmonar izquierda */}
        <Path
          d="M100 50 Q92 52 85 60"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={2.5}
        />

        {/* Venas pulmonares derechas */}
        <Path
          d="M130 140 Q120 145 110 148 M135 120 Q125 125 115 128"
          fill="none"
          stroke="#3498db"
          strokeWidth={2}
        />

        {/* Venas pulmonares izquierdas */}
        <Path
          d="M70 140 Q80 145 90 148 M65 120 Q75 125 85 128"
          fill="none"
          stroke="#3498db"
          strokeWidth={2}
        />
      </G>

      {/* Diafragma (base de los pulmones) */}
      <G>
        <Path
          d="M50 160 Q75 170 100 168 Q125 170 150 160"
          fill="none"
          stroke="#c49564"
          strokeWidth={2.5}
          strokeDasharray="5,3"
          opacity="0.6"
        />

        {/* Cúpulas diafragmáticas */}
        <Path
          d="M65 162 Q70 165 75 162 M125 162 Q130 165 135 162"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
          opacity="0.4"
        />
      </G>

      {/* Nódulos linfáticos hiliares */}
      <G opacity="0.4">
        <Circle cx="110" cy="65" r="2.5" fill="#9b59b6" />
        <Circle cx="90" cy="65" r="2.5" fill="#9b59b6" />
        <Circle cx="105" cy="70" r="2" fill="#9b59b6" />
        <Circle cx="95" cy="70" r="2" fill="#9b59b6" />
      </G>

      {/* Alvéolos (textura de fondo) */}
      <G opacity="0.15">
        {/* Pulmón derecho */}
        <Circle cx="130" cy="90" r="3" fill="#5a9fd4" />
        <Circle cx="138" cy="95" r="2.5" fill="#5a9fd4" />
        <Circle cx="125" cy="105" r="3" fill="#5a9fd4" />
        <Circle cx="135" cy="115" r="2.5" fill="#5a9fd4" />
        <Circle cx="128" cy="125" r="3" fill="#5a9fd4" />
        <Circle cx="140" cy="130" r="2.5" fill="#5a9fd4" />

        {/* Pulmón izquierdo */}
        <Circle cx="70" cy="90" r="3" fill="#5a9fd4" />
        <Circle cx="62" cy="95" r="2.5" fill="#5a9fd4" />
        <Circle cx="75" cy="105" r="3" fill="#5a9fd4" />
        <Circle cx="65" cy="115" r="2.5" fill="#5a9fd4" />
        <Circle cx="72" cy="125" r="3" fill="#5a9fd4" />
        <Circle cx="60" cy="130" r="2.5" fill="#5a9fd4" />
      </G>

      {/* Marcador de ubicación del hallazgo */}
      {marcador && (
        <G>
          <Circle
            cx={marcador.cx}
            cy={marcador.cy}
            r={9}
            fill="none"
            stroke="#DC2626"
            strokeWidth={2}
            opacity={0.9}
          />
          <Circle cx={marcador.cx} cy={marcador.cy} r={4.5} fill="#DC2626" />
          <Circle cx={marcador.cx} cy={marcador.cy} r={1.8} fill="#FFFFFF" />
        </G>
      )}
    </Svg>
  );
};

export default LungsIllustration;
