import { React } from "jimu-core";
import IVirtualLayerDefinition from "../interfaces/IVirtualLayerDefinition";

/**
 * - Poskytuje kolekci virtuálních vrstev definovaných v konfiguraci widgetu v DB registrech.
 * - @see {@link IVirtualLayerDefinition}
 */
export const VirtualLayerListContext: React.Context<Array<IVirtualLayerDefinition>> = React.createContext([]); 

export default VirtualLayerListContext;