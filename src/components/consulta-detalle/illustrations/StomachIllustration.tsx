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
  Rect,
} from "@react-pdf/renderer";

/**
 * Ilustración anatómica detallada del estómago para reportes PDF
 * Incluye esófago, cardias, fundus, cuerpo, antro, píloro, duodeno y pliegues gástricos
 */
interface Props {
  /** Marcador del hallazgo: coordenadas en el viewBox 200x180 */
  marcador?: { cx: number; cy: number };
}

const StomachIllustration: React.FC<Props> = ({ marcador }) => {
  return (
    <Svg viewBox="0 0 200 180" width={90} height={81}>
      <Defs>
        {/* Gradiente para el estómago */}
        <LinearGradient
          id="stomachGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <Stop offset="0%" stopColor="#f9e5d3" stopOpacity="1" />
          <Stop offset="50%" stopColor="#f4d5b4" stopOpacity="1" />
          <Stop offset="100%" stopColor="#e8c49a" stopOpacity="1" />
        </LinearGradient>

        {/* Gradiente para el esófago */}
        <LinearGradient
          id="esophagusGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <Stop offset="0%" stopColor="#e8c49a" stopOpacity="1" />
          <Stop offset="100%" stopColor="#d4a574" stopOpacity="1" />
        </LinearGradient>

        {/* Gradiente para sombras internas */}
        <LinearGradient id="stomachShadow" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#c49564" stopOpacity="0.2" />
          <Stop offset="100%" stopColor="#c49564" stopOpacity="0.5" />
        </LinearGradient>

        {/* Gradiente para mucosa */}
        <LinearGradient id="mucosaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#f4a582" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#e07856" stopOpacity="0.5" />
        </LinearGradient>
      </Defs>

      {/* Esófago */}
      <G>
        {/* Cuerpo del esófago */}
        <Path
          d="M100 15 L100 55"
          fill="none"
          stroke="url(#esophagusGradient)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Capas musculares del esófago */}
        <Path
          d="M96 20 L96 55 M104 20 L104 55"
          fill="none"
          stroke="#c49564"
          strokeWidth={1}
          opacity="0.4"
        />

        {/* Pliegues esofágicos */}
        <Path
          d="M98 25 L102 25 M98 32 L102 32 M98 39 L102 39 M98 46 L102 46"
          fill="none"
          stroke="#b88554"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </G>

      {/* Cardias (esfínter esofágico inferior) */}
      <G>
        <Ellipse
          cx="100"
          cy="55"
          rx="8"
          ry="5"
          fill="#d4a574"
          stroke="#c49564"
          strokeWidth={2}
        />
        <Circle cx="100" cy="55" r="3" fill="#b88554" opacity="0.6" />

        {/* Ángulo de His */}
        <Path
          d="M92 55 Q88 58 85 65"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
          strokeDasharray="2,2"
        />
      </G>

      {/* Fundus (fondo gástrico) */}
      <G>
        <Path
          d="M100 55 Q75 58 60 70 Q50 80 50 95"
          fill="url(#stomachGradient)"
          stroke="#d4a574"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Burbuja de aire del fundus */}
        <Ellipse
          cx="65"
          cy="75"
          rx="12"
          ry="8"
          fill="#ffffff"
          opacity="0.3"
          stroke="#c49564"
          strokeWidth={1}
          strokeDasharray="3,2"
        />

        {/* Pliegues del fundus */}
        <Path
          d="M58 82 Q62 84 66 82 M62 88 Q66 90 70 88"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
          opacity="0.6"
        />
      </G>

      {/* Cuerpo del estómago (curvatura mayor) */}
      <G>
        <Path
          d="M50 95 Q45 110 45 125 Q48 140 58 150 Q70 158 85 162"
          fill="none"
          stroke="#d4a574"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* Capa muscular externa */}
        <Path
          d="M50 95 Q46 110 46 125 Q49 140 59 149 Q71 157 85 161"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
          opacity="0.5"
        />
      </G>

      {/* Cuerpo del estómago (curvatura menor) */}
      <G>
        <Path
          d="M100 55 Q110 60 118 70 Q122 80 122 95 Q122 110 118 122 Q114 132 108 138"
          fill="none"
          stroke="#d4a574"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* Omento menor (ligamento) */}
        <Path
          d="M105 65 Q100 60 95 58 M110 80 Q105 75 100 73 M115 100 Q110 95 105 93"
          fill="none"
          stroke="#e8c49a"
          strokeWidth={1.5}
          strokeDasharray="4,2"
          opacity="0.5"
        />
      </G>

      {/* Relleno del estómago */}
      <Path
        d="M100 55 Q75 58 60 70 Q50 80 50 95 Q45 110 45 125 Q48 140 58 150 Q70 158 85 162 Q100 165 115 162 Q128 158 135 148 Q140 138 142 125 Q142 110 140 95 Q138 80 132 70 Q125 62 118 58 Q110 55 100 55 Z"
        fill="url(#stomachGradient)"
        opacity="0.6"
      />

      {/* Pliegues gástricos (rugae) - muy detallados */}
      <G>
        {/* Pliegues longitudinales principales */}
        <Path
          d="M70 75 Q75 80 78 90 Q80 100 82 115 Q84 125 86 138"
          fill="none"
          stroke="#c49564"
          strokeWidth={2}
          opacity="0.7"
        />
        <Path
          d="M80 78 Q85 85 88 95 Q90 105 92 120 Q94 130 96 142"
          fill="none"
          stroke="#c49564"
          strokeWidth={2}
          opacity="0.7"
        />
        <Path
          d="M90 75 Q95 82 98 92 Q100 102 102 117 Q104 127 106 140"
          fill="none"
          stroke="#c49564"
          strokeWidth={2}
          opacity="0.7"
        />

        {/* Pliegues transversales */}
        <Path
          d="M60 85 Q70 87 80 85 M55 100 Q68 102 82 100 M52 115 Q68 117 85 115 M55 130 Q70 132 88 130"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
          opacity="0.5"
        />

        {/* Pliegues secundarios */}
        <Path
          d="M65 90 Q68 92 72 90 M75 105 Q78 107 82 105 M70 120 Q73 122 77 120"
          fill="none"
          stroke="#b88554"
          strokeWidth={1.2}
          opacity="0.4"
        />
      </G>

      {/* Antro pilórico */}
      <G>
        <Path
          d="M85 162 Q100 165 115 162 Q128 158 135 148"
          fill="none"
          stroke="#d4a574"
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* Ondas peristálticas del antro */}
        <Path
          d="M95 158 Q98 160 101 158 M105 156 Q108 158 111 156 M115 154 Q118 156 121 154"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
          opacity="0.6"
        />
      </G>

      {/* Píloro (esfínter pilórico) */}
      <G>
        <Ellipse
          cx="135"
          cy="140"
          rx="6"
          ry="8"
          fill="#d4a574"
          stroke="#c49564"
          strokeWidth={2.5}
        />

        {/* Músculo del esfínter */}
        <Path
          d="M132 135 Q135 137 138 135 M132 140 Q135 142 138 140 M132 145 Q135 147 138 145"
          fill="none"
          stroke="#b88554"
          strokeWidth={2}
          opacity="0.7"
        />

        {/* Apertura pilórica */}
        <Circle cx="135" cy="140" r="2.5" fill="#e8c49a" />
      </G>

      {/* Duodeno (primera porción) */}
      <G>
        <Path
          d="M141 140 L165 140"
          fill="none"
          stroke="#d4a574"
          strokeWidth={7}
          strokeLinecap="round"
        />

        {/* Pliegues duodenales */}
        <Path
          d="M145 137 L145 143 M150 137 L150 143 M155 137 L155 143 M160 137 L160 143"
          fill="none"
          stroke="#c49564"
          strokeWidth={1.5}
        />

        {/* Ampolla de Vater (papila duodenal) */}
        <Circle cx="155" cy="140" r="2.5" fill="#b88554" opacity="0.6" />

        {/* Conducto biliar */}
        <Path
          d="M155 138 L155 125 Q155 120 150 118"
          fill="none"
          stroke="#95a552"
          strokeWidth={1.5}
          strokeDasharray="2,2"
          opacity="0.6"
        />
      </G>

      {/* Vasos sanguíneos principales */}
      <G opacity="0.4">
        {/* Arteria gástrica izquierda */}
        <Path
          d="M100 50 Q95 55 90 65 Q85 75 82 90"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={2}
        />

        {/* Arteria gástrica derecha */}
        <Path
          d="M120 65 Q125 75 128 90 Q130 105 132 120"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={2}
        />

        {/* Arteria gastroepiploica */}
        <Path
          d="M60 95 Q65 105 70 120 Q75 135 85 148"
          fill="none"
          stroke="#e74c3c"
          strokeWidth={1.8}
        />

        {/* Venas gástricas */}
        <Path
          d="M75 85 Q70 95 68 110 M95 100 Q90 110 88 125"
          fill="none"
          stroke="#3498db"
          strokeWidth={1.5}
        />
      </G>

      {/* Glándulas gástricas (textura microscópica) */}
      <G opacity="0.2">
        <Circle cx="70" cy="95" r="1.5" fill="#e07856" />
        <Circle cx="75" cy="100" r="1.5" fill="#e07856" />
        <Circle cx="80" cy="105" r="1.5" fill="#e07856" />
        <Circle cx="85" cy="110" r="1.5" fill="#e07856" />
        <Circle cx="90" cy="115" r="1.5" fill="#e07856" />
        <Circle cx="95" cy="120" r="1.5" fill="#e07856" />
        <Circle cx="78" cy="95" r="1.5" fill="#e07856" />
        <Circle cx="83" cy="100" r="1.5" fill="#e07856" />
        <Circle cx="88" cy="105" r="1.5" fill="#e07856" />
        <Circle cx="93" cy="110" r="1.5" fill="#e07856" />
      </G>

      {/* Mucosa gástrica (capa interna brillante) */}
      <G opacity="0.3">
        <Path
          d="M65 75 Q70 80 75 90 Q80 100 85 115 Q88 125 92 140"
          fill="none"
          stroke="url(#mucosaGradient)"
          strokeWidth={15}
        />
      </G>

      {/* Omento mayor (epiplón) */}
      <G opacity="0.4">
        <Path
          d="M60 95 Q55 105 52 120 Q50 135 52 150 M70 110 Q65 120 62 135 Q60 145 62 155 M80 125 Q75 135 72 145 Q70 155 72 165"
          fill="none"
          stroke="#f9e5d3"
          strokeWidth={2}
          strokeDasharray="5,3"
        />
      </G>

      {/* Serosa (capa externa brillante) */}
      <Path
        d="M75 65 Q80 68 85 70"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        opacity="0.5"
        strokeLinecap="round"
      />

      {/* Sombras para profundidad */}
      <G>
        <Path
          d="M52 100 Q48 115 48 130 Q50 142 56 152"
          fill="none"
          stroke="url(#stomachShadow)"
          strokeWidth={12}
        />
        <Path
          d="M115 70 Q118 85 118 100 Q118 115 115 128"
          fill="none"
          stroke="url(#stomachShadow)"
          strokeWidth={8}
        />
      </G>

      {/* Nervio vago (inervación) */}
      <G opacity="0.3">
        <Path
          d="M95 58 Q92 65 90 75 M105 58 Q108 65 110 75"
          fill="none"
          stroke="#f39c12"
          strokeWidth={1.2}
          strokeDasharray="2,1"
        />
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

export default StomachIllustration;
