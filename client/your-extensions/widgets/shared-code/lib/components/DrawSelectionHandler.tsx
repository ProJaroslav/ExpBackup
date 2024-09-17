import { React } from "jimu-core";
import { useHsiSelection } from "widgets/shared-code/hooks";
import { NotificationHelper, GeometryHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";

/**
 * - Stará se o vykreslení geometrie prvků ve výběru.
 * - Nic se nevykresluje do DOM, tudíž může být vložena kamkoliv kde je poskytnuto {@link JimuMapViewContext}.
 */
export default React.memo(function() {
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Grafická vrstva do které se vykresluje geometrie prvků ve výběru. */
    const [graphicsLayer, setGraphicsLayer] = React.useState<__esri.GraphicsLayer>();
    /** - Gravické prvky ve výběru. */
    const selection = useHsiSelection({ jimuMapView, populate: true });

    /** - Načtení grafické vrstvy do které se vykresluje geometrie prvků ve výběru {@link graphicsLayer}. */
    React.useEffect(() => {
        const abortController = new AbortController();
        let newGraphicsLayer: __esri.GraphicsLayer;

        if (!!jimuMapView) {
            (async function() {
                try {
                    const JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(['GraphicsLayer']);
    
                    await JSAPIModuleLoader.load();
    
                    const selectionSet = SelectionManager.getSelectionSet(jimuMapView);
    
                    newGraphicsLayer = new (JSAPIModuleLoader.getModule("GraphicsLayer"))({
                        title: selectionSet.name,
                        id: selectionSet.selectionSetKey
                    });
    
                    if (!abortController.signal.aborted) {
                        jimuMapView.view.map.add(newGraphicsLayer);
                        setGraphicsLayer(newGraphicsLayer);
                    }
    
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        NotificationHelper.addNotification({ type: "error", message: "Failed to load Graphics Layer to display selection." });
                    }
                }
            })();
    
            return function() {
                abortController.abort();
                if (!!newGraphicsLayer) {
                    if (!newGraphicsLayer.destroyed) {
                        newGraphicsLayer.destroy();
                    }
    
                    if (!!jimuMapView.view.map) {
                        jimuMapView.view.map.remove(newGraphicsLayer);
                    }
                }
            }
        }
    }, [jimuMapView]);

    /** - Vykreslení geometrie prvků ve výběru. */
    React.useEffect(() => {
        if (!!graphicsLayer && !!selection?.selection) {
            let isActive = true;

            (async function() {
                try {
                    const color = await SelectionManager.getSelectionSet(jimuMapView).getColor();

                    const features: Array<__esri.Graphic> = [];

                    for (let layerSelection of Object.values(selection?.selection)) {
                        if (Array.isArray(layerSelection?.featureSet?.features)) {
                            let symbol = await GeometryHelper.getSymbology(layerSelection.featureSet.geometryType, {
                                color,
                                fillOpacity: .2
                            });

                            for (let feature of layerSelection.featureSet.features) {
                                feature.symbol = symbol;  
                                features.push(feature);
                            }
                        }
                    }

                    if (isActive) {
                        graphicsLayer.addMany(features);
                    }
                } catch(err) {
                    console.warn(err);
                }
            } ())

            return function() {
                graphicsLayer.removeAll();
                isActive = false;
            }
        }
    });

    return <></>;
})