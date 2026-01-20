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
} from "@react-pdf/renderer";

/**
 * Ilustración anatómica detallada del colon para reportes PDF
 * Incluye todas las secciones del intestino grueso con detalles anatómicos precisos
 */
const ColonIllustration: React.FC = () => {
  return (
    <Svg viewBox="0 0 200 180" width={140} height={126}>
      <Defs>
        {/* Gradiente para dar profundidad al colon */}
        <LinearGradient id="colonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#f4a582" stopOpacity="1" />
          <Stop offset="50%" stopColor="#e07856" stopOpacity="1" />
          <Stop offset="100%" stopColor="#d16847" stopOpacity="1" />
        </LinearGradient>

        {/* Gradiente para sombras */}
        <LinearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#c96543" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#c96543" stopOpacity="0.8" />
        </LinearGradient>
      </Defs>

      {/* Ciego (parte inferior derecha) */}
      <G>
        {/* Cuerpo del ciego */}
        <Ellipse
          cx="35"
          cy="150"
          rx="15"
          ry="18"
          fill="url(#colonGradient)"
          stroke="#c96543"
          strokeWidth={2.5}
        />

        {/* Apéndice vermiforme */}
        <Path
          d="M35 168 Q32 175 30 182 Q28 188 26 192"
          fill="none"
          stroke="#d16847"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Circle cx="26" cy="192" r="2.5" fill="#c96543" />

        {/* Válvula ileocecal */}
        <Circle cx="35" cy="135" r="3" fill="#b85533" />
        <Path
          d="M35 132 L35 125"
          stroke="#b85533"
          strokeWidth={2}
          strokeDasharray="2,2"
        />
      </G>

      {/* Colon ascendente */}
      <G>
        <Path
          d="M35 132 L35 50"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Haustras (pliegues) del colon ascendente */}
        <Path
          d="M42 125 Q45 125 45 122 M42 110 Q45 110 45 107 M42 95 Q45 95 45 92 M42 80 Q45 80 45 77 M42 65 Q45 65 45 62"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M28 125 Q25 125 25 122 M28 110 Q25 110 25 107 M28 95 Q25 95 25 92 M28 80 Q25 80 25 77 M28 65 Q25 65 25 62"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Sombra interna */}
        <Path
          d="M32 130 L32 52"
          fill="none"
          stroke="url(#shadowGradient)"
          strokeWidth={3}
          opacity="0.4"
        />
      </G>

      {/* Flexura hepática (ángulo superior derecho) */}
      <G>
        <Path
          d="M35 50 Q35 40 45 40"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <Circle cx="40" cy="45" r="8" fill="#e07856" opacity="0.3" />
      </G>

      {/* Colon transverso */}
      <G>
        <Path
          d="M45 40 L155 40"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Haustras del colon transverso */}
        <Path
          d="M60 33 Q60 30 63 30 M80 33 Q80 30 83 30 M100 33 Q100 30 103 30 M120 33 Q120 30 123 30 M140 33 Q140 30 143 30"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M60 47 Q60 50 63 50 M80 47 Q80 50 83 50 M100 47 Q100 50 103 50 M120 47 Q120 50 123 50 M140 47 Q140 50 143 50"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Sombra interna */}
        <Path
          d="M47 37 L153 37"
          fill="none"
          stroke="url(#shadowGradient)"
          strokeWidth={3}
          opacity="0.4"
        />

        {/* Epiplón mayor (ligamento) */}
        <Path
          d="M70 46 Q70 55 75 60 M100 46 Q100 55 105 60 M130 46 Q130 55 135 60"
          fill="none"
          stroke="#d4a574"
          strokeWidth={1.5}
          strokeDasharray="3,2"
          opacity="0.6"
        />
      </G>

      {/* Flexura esplénica (ángulo superior izquierdo) */}
      <G>
        <Path
          d="M155 40 Q165 40 165 50"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={12}
          strokeLinecap="round"
        />
        <Circle cx="160" cy="45" r="8" fill="#e07856" opacity="0.3" />
      </G>

      {/* Colon descendente */}
      <G>
        <Path
          d="M165 50 L165 132"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Haustras del colon descendente */}
        <Path
          d="M158 62 Q155 62 155 65 M158 77 Q155 77 155 80 M158 92 Q155 92 155 95 M158 107 Q155 107 155 110 M158 122 Q155 122 155 125"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M172 62 Q175 62 175 65 M172 77 Q175 77 175 80 M172 92 Q175 92 175 95 M172 107 Q175 107 175 110 M172 122 Q175 122 175 125"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Sombra interna */}
        <Path
          d="M168 52 L168 130"
          fill="none"
          stroke="url(#shadowGradient)"
          strokeWidth={3}
          opacity="0.4"
        />
      </G>

      {/* Colon sigmoide */}
      <G>
        <Path
          d="M165 132 Q165 145 155 150 Q145 155 135 152 Q125 149 120 142"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={12}
          strokeLinecap="round"
        />

        {/* Haustras del sigmoide */}
        <Path
          d="M160 138 Q157 138 157 141 M150 148 Q147 148 147 151"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Mesocolon sigmoideo (ligamento) */}
        <Path
          d="M150 145 Q145 155 140 165"
          fill="none"
          stroke="#d4a574"
          strokeWidth={1.5}
          strokeDasharray="3,2"
          opacity="0.6"
        />
      </G>

      {/* Recto */}
      <G>
        <Path
          d="M120 142 L105 165"
          fill="none"
          stroke="url(#colonGradient)"
          strokeWidth={11}
          strokeLinecap="round"
        />

        {/* Válvulas de Houston (pliegues rectales) */}
        <Path
          d="M115 148 Q112 148 112 151 M112 156 Q109 156 109 159"
          fill="none"
          stroke="#c96543"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Canal anal */}
        <Path
          d="M105 165 L100 172"
          fill="none"
          stroke="#d16847"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <Circle cx="100" cy="172" r="4" fill="#b85533" />
      </G>

      {/* Vasos sanguíneos principales */}
      <G opacity="0.4">
        {/* Arteria mesentérica superior */}
        <Path
          d="M100 30 L100 45 M100 40 L70 60 M100 40 L130 60"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={1.5}
        />

        {/* Arteria mesentérica inferior */}
        <Path
          d="M100 100 L130 120 M100 100 L140 140"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={1.5}
        />
      </G>

      {/* Etiquetas anatómicas (opcional, comentadas para no saturar) */}
      {/* 
      <Text x="10" y="150" fontSize="8" fill="#333">Ciego</Text>
      <Text x="10" y="90" fontSize="8" fill="#333">C. Ascendente</Text>
      <Text x="80" y="25" fontSize="8" fill="#333">C. Transverso</Text>
      <Text x="175" y="90" fontSize="8" fill="#333">C. Descendente</Text>
      <Text x="125" y="155" fontSize="8" fill="#333">Sigmoide</Text>
      <Text x="85" y="175" fontSize="8" fill="#333">Recto</Text>
      */}
    </Svg>
  );
};

export default ColonIllustration;
