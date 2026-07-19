import React from "react";
import {
  kernelNitidez,
  matrizCanales,
  type VideoAjustes,
} from "../../utils/videoAjustes";

/**
 * Definiciones SVG de los filtros de video que no existen como filtro CSS:
 *  - #aim-nitidez: enfoque (feConvolveMatrix)
 *  - #aim-canales: balance de color rojo/verde/azul (feColorMatrix)
 * Deben estar montadas en el documento donde se use construirFiltro() —
 * tanto para CSS filter (video en vivo, vista previa) como para ctx.filter
 * del canvas de grabación/capturas.
 */
const FiltrosVideoSVG: React.FC<{ ajustes: VideoAjustes }> = ({ ajustes }) => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    <filter id="aim-nitidez">
      <feConvolveMatrix
        order="3"
        preserveAlpha="true"
        kernelMatrix={kernelNitidez(ajustes.nitidez)}
      />
    </filter>
    {/* sRGB para que la ganancia por canal actúe sobre los colores tal como
        se ven en pantalla (el default linearRGB desvirtúa el resultado) */}
    <filter id="aim-canales" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values={matrizCanales(ajustes)} />
    </filter>
  </svg>
);

export default FiltrosVideoSVG;
