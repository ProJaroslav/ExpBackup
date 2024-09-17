import { JimuMapView } from "jimu-arcgis";
import { React } from "jimu-core";

/**
 * - Předává JimuMapView poskytnuté jednou z rodičovských komponent.
 * @see {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
 * @see {@link https://reactjs.org/docs/context.html}.
 */
export const JimuMapViewContext = React.createContext<JimuMapView>(null);

export default JimuMapViewContext;