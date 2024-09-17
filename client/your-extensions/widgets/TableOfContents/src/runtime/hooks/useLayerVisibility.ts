import { React } from "jimu-core";

/**
 * - Poskytuje informaci zda má vrstva zaplou viditelnost.
 * @param layer - Vrstva nebo podvrstva u které zjišťujeme viditelnost.
 */
export default function(layer: __esri.MapImageLayer | __esri.Sublayer | __esri.WMSLayer | __esri.FeatureLayer): boolean {
    const [isVisible, setIsVisible] = React.useState(layer.visible);

    React.useEffect(() => {
        if (layer) {
            setIsVisible(layer.visible);
            
            /** - Naslouchání na změnu viditelnosti vrstvy. */
            const listener = layer.watch("visible", setIsVisible);

            return listener.remove;
        }
    }, [layer]);

    return isVisible;
}