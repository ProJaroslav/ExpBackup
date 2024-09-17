import { JimuMapView, LayerTypes } from "jimu-arcgis";
import { DbRegistryLoader, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

export default class SketchHelper {

    /**
     * - Vytvoření nástroje pro kreslení geometrie.
     * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Sketch-SketchViewModel.html}
     * @param jimuMapView - JimuMapView mapy. {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView.}
     * @param snappingEnabled - Pokud 'true' bude povoleno snapování k objektům ve výběru. 
     * @param graphicLayer - Grafická vrstva do které bude nástroj vykreslovat geometrii. Pokud není definována, vytvoří se nová vrstva. 
     */
    public static async loadSketch(jimuMapView: JimuMapView, snappingEnabled?: boolean, graphicLayer?: __esri.GraphicsLayer): Promise<__esri.SketchViewModel> {
        const [SnappingOptions, SketchViewModel] = await Promise.all([
            ArcGISJSAPIModuleLoader.getModule("SnappingOptions"),
            ArcGISJSAPIModuleLoader.getModule("SketchViewModel")
        ]);
    
        let snappingOptions: __esri.SnappingOptions;
    
        if (!graphicLayer) {
            const GraphicsLayer = await ArcGISJSAPIModuleLoader.getModule("GraphicsLayer");
            graphicLayer = new GraphicsLayer();
        }
    
        if (snappingEnabled) {
    
            const graphicsLayers = jimuMapView.view.map.layers.filter(layer => layer.type === LayerTypes.GraphicsLayer) as __esri.Collection<__esri.GraphicsLayer>;
    
            const FeatureSnappingLayerSource = await ArcGISJSAPIModuleLoader.getModule("FeatureSnappingLayerSource");
    
            const featureSources = graphicsLayers.map(graphicsLayer => new FeatureSnappingLayerSource({ enabled: true, layer: graphicsLayer }));
    
            if (!graphicsLayers.includes(graphicLayer)) {
                featureSources.push(new FeatureSnappingLayerSource({ enabled: true, layer: graphicLayer }));
            }
    
            snappingOptions = new SnappingOptions({
                enabled: true,
                featureSources
            });
        } else {
            snappingOptions = new SnappingOptions({ enabled: false });
        }
    
        return new SketchViewModel({
            view: jimuMapView.view,
            layer: graphicLayer,
            snappingOptions
        });
    }
    
    /**
     * - Pokud v {@link EDbRegistryKeys.RemoveSketchDot konfiguraci} není nastaveno jinak, tak se {@link sketch kreslícímu nástroji} nastaví transparentní bodová geometie.
     * @param jimuMapView - JimuMapView mapy. {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView.} 
     * @param sketch - Kreslící nástroj.
     */
    public static async transparentGeometry(jimuMapView: JimuMapView, sketch: __esri.SketchViewModel): Promise<void> {
        try {
            const removeDot = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RemoveSketchDot, scope: "global", type: "bool" });
            if (removeDot !== false) {
                sketch.pointSymbol.color.a = 0;
                sketch.pointSymbol.outline.color.a = 0;
            }
        } catch(err) {
            console.warn(err);
        }
    }

    public static async loadSketchWithUi(jimuMapView: JimuMapView, snappingEnabled?: boolean, graphicLayer?: __esri.GraphicsLayer): Promise<__esri.Sketch> {
        const [viewModel, Sketch] = await Promise.all([
            SketchHelper.loadSketch(jimuMapView, snappingEnabled, graphicLayer),
            ArcGISJSAPIModuleLoader.getModule("Sketch")
        ]);

        return new Sketch({ viewModel });
    }
};