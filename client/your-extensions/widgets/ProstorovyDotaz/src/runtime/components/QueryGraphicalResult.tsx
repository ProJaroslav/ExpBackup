import React, { useContext, useEffect } from "react";
import { AllWidgetProps, useIntl } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ArcGISJSAPIModuleLoader, GeometryHelper } from "widgets/shared-code/helpers";
import { LayerTypes } from "jimu-arcgis";

const ModuleLoader = new ArcGISJSAPIModuleLoader([
    "GraphicsLayer",
    "Graphic",
    "Color",
    "SimpleFillSymbol",
    "SimpleLineSymbol",
    "SimpleMarkerSymbol"
]);

const polygonCoords = [
    [-1, 1],
    [-5, 1],
    [-1, 20],
    [-5, 20],
];

export default function (props: { widgetId: string }) {
    const jimuMapView = useContext(JimuMapViewContext);
    const graphicLayerId = `highlight-layer-${props.widgetId}`;
    let isActive = true;

    let graphicsLayer: __esri.GraphicsLayer;
    let graphicsToDisplay: Array<__esri.Graphic> = [];

    useEffect(() => {
        (async function () {
            try {
                if (!ModuleLoader.isLoaded) {
                    await ModuleLoader.load();

                    if (!isActive) {
                        return;
                    }
                }

                const Graphic = ModuleLoader.getModule("Graphic");
                const SimpleFillSymbol = ModuleLoader.getModule("SimpleFillSymbol");
                const Color = ModuleLoader.getModule("Color");
                const GraphicsLayer = ModuleLoader.getModule("GraphicsLayer");

                const polygon = {
                    type: "polygon",
                    rings: polygonCoords
                };

                const simpleFillSymbol = new SimpleFillSymbol({
                    color: new Color([227, 139, 79, 0.8]),
                    outline: {
                        color: new Color([109, 0, 44]),
                        width: 800
                    }
                });

                const polygonGraphic = new Graphic({
                    geometry: polygon,
                    symbol: simpleFillSymbol,
                });

                graphicsToDisplay = [polygonGraphic];

                const layer = jimuMapView.view.map.findLayerById("50");

                graphicsLayer.addMany(
                    graphicsToDisplay.map((feature) => {
                        return feature;
                    })
                )

                if (!graphicsLayer) {
                    graphicsLayer = new GraphicsLayer({ id: graphicLayerId });
                    jimuMapView.view.map.add(graphicsLayer);
                } else if (graphicsLayer.type !== LayerTypes.GraphicsLayer) {
                    return;
                }

                let geometryType: __esri.FeatureSet["geometryType"];

                const symbology = GeometryHelper.getSymbologySync(
                    "polygon",
                    {
                        SimpleFillSymbol: ModuleLoader.getModule("SimpleFillSymbol"),
                        SimpleLineSymbol: ModuleLoader.getModule("SimpleLineSymbol"),
                        SimpleMarkerSymbol: ModuleLoader.getModule("SimpleMarkerSymbol")
                    },
                    {
                        color: new (ModuleLoader.getModule("Color"))([137, 96, 197, 1]),
                        fillOpacity: 1
                    }
                );

;
            } catch (err) {
                console.warn(err);
            }
        })();


            console.log(jimuMapView.view.map.layers);

        return () => {
            isActive = false;
            if (graphicsLayer) {
                graphicsLayer.removeAll();
            }
        };
    }, [jimuMapView]);

    return (
        <div>
            <p>Test</p>
        </div>
    );
}
