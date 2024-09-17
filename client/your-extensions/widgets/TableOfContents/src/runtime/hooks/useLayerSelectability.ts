import { LayerHelper } from "widgets/shared-code/helpers";
import { useHsiSelection } from "widgets/shared-code/hooks";

/**
 * - Poskytuje informaci zda má podvrstva zaplou vybíratelnost.
 * @param layer - Podvrstva u které zjišťujeme vybíratelnost.
 */
export default function(layer: __esri.Sublayer): boolean {
    const selection = useHsiSelection();
    return selection.selectableLayers.includes(LayerHelper.getGisIdLayersFromLayer(layer));
}