import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, ArcGISJSAPIModuleLoader, GeometryHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { LoadingButton } from "widgets/shared-code/components";
import translations from "../translations/default";
import { type JimuMapView, LayerTypes } from "jimu-arcgis";
import { useIsSomeSelected } from "widgets/shared-code/hooks";

const { useState, useContext, useEffect } = React;
const ModuleLoader = new ArcGISJSAPIModuleLoader(["Color", "SimpleFillSymbol", "SimpleLineSymbol", "SimpleMarkerSymbol"]);

class GraphicsLayerProvider {
    private static graphicLayer: __esri.GraphicsLayer;

    public static async addToMap(jimuMapView: JimuMapView) {
        if (!GraphicsLayerProvider.graphicLayer) {
            await GraphicsLayerProvider.createGraphicLayer();
        }

        if (!jimuMapView.view.map.layers.includes(GraphicsLayerProvider.graphicLayer)) {
            jimuMapView.view.map.add(GraphicsLayerProvider.graphicLayer);
        }
    }

    public static removeFromMap(jimuMapView: JimuMapView) {
        if (!!GraphicsLayerProvider.graphicLayer && jimuMapView.view.map.layers.includes(GraphicsLayerProvider.graphicLayer)) {
            jimuMapView.view.map.remove(GraphicsLayerProvider.graphicLayer);
        }
    }

    public static removeGraphics() {
        if (!!GraphicsLayerProvider.graphicLayer) {
            GraphicsLayerProvider.graphicLayer.removeAll();
        }
    }

    public static addGraphics(graphics: Array<__esri.Graphic>) {
        if (!!GraphicsLayerProvider.graphicLayer) {
            GraphicsLayerProvider.graphicLayer.addMany(graphics);
        }
    }

    public static async addGraphicsToMap(jimuMapView: JimuMapView, graphics: Array<__esri.Graphic>) {
        await GraphicsLayerProvider.addToMap(jimuMapView);
        GraphicsLayerProvider.graphicLayer.addMany(graphics);
    }

    private static async createGraphicLayer() {
        const GraphicLayer = await ArcGISJSAPIModuleLoader.getModule("GraphicsLayer");
        GraphicsLayerProvider.graphicLayer = new GraphicLayer();
    }
}

/** - Tlačítko pro zvýraznění prvků vybraných v tabulce v mapě. */
export default function({ tableRef, highlightColor, fetureProvider }: HSI.FeatureTableComponent.IHighlightButton) {
    /** - Je v {@link tableRef tabulce} vybrán nějaký prvek? */
    const isSomeSelected = useIsSomeSelected(tableRef);
    const [isSelecting, toggleSelecting] = useState<boolean>(false);
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);

    useEffect(() => {
        return function() {
            GraphicsLayerProvider.removeFromMap(jimuMapView);
        }
    }, [jimuMapView]);
    
    /** - Zvýraznění prvků vybraných v tabulce v mapě. */
    async function highlight() {
        try {
            toggleSelecting(true);
            GraphicsLayerProvider.removeGraphics();
            let features: Array<__esri.Graphic> = [];

            if (typeof fetureProvider === "function") {
                features = await fetureProvider();
            } else if (tableRef.current.layer.type === LayerTypes.FeatureLayer) {
                const featureSet = await tableRef.current.layer.queryFeatures({
                    objectIds: tableRef.current.highlightIds.map(id => typeof id === "string" ? parseInt(id) : id).toArray(),
                    returnGeometry: true,
                    outFields: [tableRef.current.layer.objectIdField]
                });
                features = featureSet.features;
            }

            if (!ModuleLoader.isLoaded) {
                await ModuleLoader.load();
            }
            
            features.forEach(feature => {
                feature.symbol = GeometryHelper.getSymbologySync(feature.geometry.type, {
                    SimpleFillSymbol: ModuleLoader.getModule("SimpleFillSymbol"),
                    SimpleLineSymbol: ModuleLoader.getModule("SimpleLineSymbol"),
                    SimpleMarkerSymbol: ModuleLoader.getModule("SimpleMarkerSymbol")
                }, {
                    color: new (ModuleLoader.getModule("Color"))(highlightColor)
                });
            });

            await Promise.all([
                GeometryHelper.zoom(jimuMapView, features),
                GraphicsLayerProvider.addGraphicsToMap(jimuMapView, features)
            ]);

        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("failedToHighlight"), err, "warning");
        } finally {
            toggleSelecting(false);
        }
    }

    return <LoadingButton
        disabled={!isSomeSelected || isSelecting}
        onClick={highlight}
        loading={isSelecting}
    >
        {messageFormater("highlightButton")}
    </LoadingButton>;
}