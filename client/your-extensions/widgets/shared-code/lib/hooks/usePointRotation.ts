import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { GeometryHelper, ArcGISJSAPIModuleLoader, RotationHelper } from "widgets/shared-code/helpers";
import { EConstants } from "widgets/shared-code/enums";

/**
 * - Zobrazuje v mapě bod, pomocí kterého lze měnit rotaci bodového prvku {@link feature}. 
 * @param feature - Prvek kterým chceme rotovat.
 * @param isRotating - Může být v roučasné chvíli prvkem {@link feature} rotováno?
 * @param sketchModel - Nástroj kreslení, ve kterém se bude zobrazovat bod, pomocí kterého se rotuje prvkem {@link feature}. 
 * @param rotationInfo - Informace o rotaci prvku {@link feature}.
 */
export default function(feature: __esri.Graphic, isRotating: boolean, sketchModel: __esri.SketchViewModel, rotationInfo: HSI.IRotationInfo): void {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const moduleLoaderRef = React.useRef(new ArcGISJSAPIModuleLoader(['Color', 'Polyline', 'geometryEngine', "geometryEngineAsync"], true));
    
    /** - Zajištění správné rorace symbologie {@link feature}. */
    React.useEffect(() => {
        if (!!sketchModel && feature?.geometry?.type === "point" && !!rotationInfo?.rotationAttribute) {
            const xoffset = (feature.symbol as __esri.MarkerSymbol).xoffset || 0;
            const yoffset = (feature.symbol as __esri.MarkerSymbol).yoffset || 0;

            const rotationType = rotationInfo.rotationType || "geographic";
            /** - Naslouchání na změnu pozice pomocného bodu, a změna rotace {@link state.newFeature}. */
            const rotateListener = sketchModel.on("update", () => {
                try {
                    /** - Bod, pomocí kterého se natáčí {@link feature}. */
                    let updateGraphic = sketchModel.layer.graphics.find(graphic => graphic.getAttribute(EConstants.rotationHelpAttrinbute));
                    if (updateGraphic) {
                        const symbol = feature.symbol as __esri.MarkerSymbol;
                        feature.symbol = null;
                        const geometry = feature.geometry as __esri.Point;
    
                        const point = jimuMapView.view.toScreen(geometry);
                        const updateGraphicPoint = jimuMapView.view.toScreen(updateGraphic.geometry as __esri.Point);
                        const xDiff = point.x - updateGraphicPoint.x;
                        const yDiff = updateGraphicPoint.y - point.y;
                        
                        if (yDiff < 0) {
                            symbol.angle = Math.atan(xDiff / yDiff) * (180 / Math.PI);
                        } else {
                            symbol.angle = Math.atan(xDiff / yDiff) * (180 / Math.PI) + 180;
                        }

                        let rotation = symbol.angle - jimuMapView.view.viewpoint.rotation;

                        
                        if (rotationType === "arithmetic") {
                            rotation = RotationHelper.geographicArithmeticTo(rotation);
                        }

                        rotation -= rotationInfo.rotationDifference;
                        
                        while (rotation < 0 || rotation > 360) {
                            if (rotation < 0) {
                                rotation += 360;
                            } else {
                                rotation -= 360;
                            }
                        }

                        if (moduleLoaderRef.current.isLoaded && (!!symbol.yoffset || !!symbol.xoffset)) {
                            const xoffset = symbol.xoffset || 0;
                            const yoffset = symbol.yoffset || 0;
                            const helpLine = new (moduleLoaderRef.current.getModule("Polyline"))({ spatialReference: feature.geometry.spatialReference });
                            const help = jimuMapView.view.toScreen(jimuMapView.view.toMap(point));
                            help.x += xoffset;
                            help.y += yoffset;
                            helpLine.addPath([geometry, jimuMapView.view.toMap(help)]);

                            const rotatedPolyline = moduleLoaderRef.current.getModule('geometryEngine').rotate(helpLine, ((parseFloat(feature.getAttribute(rotationInfo.rotationAttribute)) || 0) - rotation), helpLine.getPoint(0, 0)) as __esri.Polyline;

                            const screenHP = jimuMapView.view.toScreen(rotatedPolyline.getPoint(0, 1));

                            symbol.xoffset = screenHP.x - point.x;
                            symbol.yoffset = screenHP.y - point.y;
                        }

                        feature.setAttribute(rotationInfo.rotationAttribute, rotation);
    
                        feature.symbol = symbol;
                    }
                } catch(err) {
                    console.warn(err);
                }
            });

            /**
             * - Při změně {@link jimuMapView.view.extent} se přepočítá rotace symbolu {@link feature}
             * - Důvod je, že rotace symbolu je vůči oknu prohlížeče, ne vůči severu.
             * - Bohužel nejde naslouchat na změnu rotace mapy ({@link jimuMapView.view.viewpoint.rotation}).
             */
            const extendListener = jimuMapView.view.watch("extent", () => {
                try {
                    const symbol = feature.symbol as __esri.MarkerSymbol;
                    feature.symbol = null;

                    symbol.angle = (parseFloat(feature.getAttribute(rotationInfo.rotationAttribute)) || 0) + rotationInfo.rotationDifference;
                    if (rotationType === "arithmetic") {
                        symbol.angle = RotationHelper.arithmeticToGeographic(symbol.angle);
                    }

                    symbol.angle += jimuMapView.view.viewpoint.rotation;

                    if (moduleLoaderRef.current.isLoaded && (!!symbol.yoffset || !!symbol.xoffset)) {
                        const geometry = feature.geometry as __esri.Point;
    
                        const point = jimuMapView.view.toScreen(geometry);
                        const helpLine = new (moduleLoaderRef.current.getModule("Polyline"))({ spatialReference: feature.geometry.spatialReference });
                        const help = jimuMapView.view.toScreen(jimuMapView.view.toMap(point));
                        help.x += xoffset;
                        help.y += yoffset;
                        helpLine.addPath([geometry, jimuMapView.view.toMap(help)]);

                        const rotatedPolyline = moduleLoaderRef.current.getModule('geometryEngine').rotate(helpLine, jimuMapView.view.viewpoint.rotation - (parseFloat(feature.getAttribute(rotationInfo.rotationAttribute)) || 0) - 90, helpLine.getPoint(0, 0)) as __esri.Polyline;

                        const screenHP = jimuMapView.view.toScreen(rotatedPolyline.getPoint(0, 1));

                        symbol.xoffset = point.x - screenHP.x;
                        symbol.yoffset = point.y - screenHP.y;
                    }
    
                    feature.symbol = symbol;
                } catch(err) {
                    console.warn(err);
                }
            });

            return function () {
                rotateListener.remove();
                extendListener.remove();
            };
        }
    }, [sketchModel, feature, jimuMapView, rotationInfo?.rotationAttribute, rotationInfo?.rotationType, rotationInfo?.rotationDifference, moduleLoaderRef]);

    /** - Pokud je {@link isRotating} true, tak se vytvoří bod, pomocí kterého je možno rotovat prevek {@link feature}. */
    React.useEffect(() => {
        if (isRotating && !!sketchModel && !!rotationInfo?.rotationAttribute && feature?.geometry?.type === "point" && moduleLoaderRef.current.isLoaded) {
            const rotationType = rotationInfo.rotationType || "geographic";
            var isActive = true;

            const color = new (moduleLoaderRef.current.getModule("Color"))([255, 145, 0, 1]);
            /** - Bod, pomocí kterého je možno rotovat {@link feature prvek}. */
            const helpPoint = feature.clone()
            /** - Geometrie {@link helpPoint pomocného bodu}. */
            const helpPointGeometry = helpPoint.geometry.clone() as __esri.Point;

            /** - Čára 50 px severně od {@link feature}. */
            const polyline = new (moduleLoaderRef.current.getModule("Polyline"))({ paths: [[[helpPointGeometry.x, helpPointGeometry.y], [helpPointGeometry.x, helpPointGeometry.y + (jimuMapView.view.resolution * 50)]]], spatialReference: helpPointGeometry.spatialReference });

            let rotation = (parseFloat(feature.getAttribute(rotationInfo.rotationAttribute)) || 0) + rotationInfo.rotationDifference;
            if (rotationType === "arithmetic") {
                rotation = RotationHelper.arithmeticToGeographic(rotation);
            }

            Promise.all([
                GeometryHelper.getSymbology("point", { pointColor: color, lineColor: color }),
                /** - Rotace {@link polyline} podle současného natočení {@link state.newFeature}. */
                moduleLoaderRef.current.getModule("geometryEngineAsync").rotate(polyline, -1 * rotation, helpPointGeometry) as Promise<__esri.Polyline>
            ])
                .then(([symbol, rotatedPolyline]) => {
                    if (isActive) {
                        helpPoint.symbol = symbol;
                        helpPoint.setAttribute(EConstants.rotationHelpAttrinbute, true);

                        helpPointGeometry.x = rotatedPolyline.paths[0][1][0];
                        helpPointGeometry.y = rotatedPolyline.paths[0][1][1];

                        helpPoint.geometry = helpPointGeometry;

                        sketchModel.layer.add(helpPoint);

                        sketchModel.update(helpPoint, {
                            tool: "move"
                        });
                    }
                })
                .catch(err => {
                    console.warn(err);
                });

                return function() {
                    isActive = false;
                    let updateGraphics = sketchModel?.layer?.graphics?.filter(graphic => graphic.getAttribute(EConstants.rotationHelpAttrinbute));
                    if (!!updateGraphics) {
                        sketchModel.layer.graphics.removeMany(updateGraphics);
                        for (let updateGraphic of updateGraphics) {
                            if (!updateGraphic.destroyed) {
                                updateGraphic.destroy();
                            }
                        }
                    }
                }
        }
    }, [sketchModel, isRotating, jimuMapView, rotationInfo?.rotationAttribute, rotationInfo?.rotationType, feature, rotationInfo?.rotationDifference, moduleLoaderRef]);
}