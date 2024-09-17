import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { GeometryHelper, ArcGISJSAPIModuleLoader, RotationHelper } from "widgets/shared-code/helpers";
import { EConstants, ESymbolRenderType } from "widgets/shared-code/enums";

/**
 * - Stará se o vykreslení symbologie bodového prvku.
 * - Pokud je {@link ISymbologyRendererParams.isRotating isRotating} true, tak se vytvoří bod, pomocí kterého je možno rotovat symbologií prvku {@link ISymbologyRendererParams.feature feature}.
 */
export default function(params: ISymbologyRendererParams): void {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const moduleLoaderRef = React.useRef(new ArcGISJSAPIModuleLoader(['Color', 'Polyline', 'geometryEngine', "SimpleFillSymbol", "SimpleLineSymbol", "SimpleMarkerSymbol"], true));
    /** - Typ rotece symbologie {@link params.defaultSymbol defaultSymbol}. */
    const rotationType = params.rotationInfo?.rotationType || "geographic";
    /**
     * - Reference funckce zajišťujicí správné vykreslení symbologie při změně extentu mapy.
     * - Funkce je v referenci aby se zbytečně nevytvářelo naslouchání na změnu extentu při každém renderu.
     */
    const onExtentChangeHandlerRef = React.useRef<() => void>(() => {});
    /**
     * - Reference funckce zajišťujicí, že se při změně polohy pomocného bodu(pro rotování symbologie) překreslý symbologie prvku {@link params.feature}.
     * - Funkce je v referenci aby se zbytečně nevytvářelo naslouchání na změnu polohy pomocného bodu při každém renderu.
     */
    const onRotateHandlerRef = React.useRef<() => void>(() => {});

    /** - Naplnění referencí {@link onExtentChangeHandlerRef} a {@link onRotateHandlerRef}. */
    React.useEffect(() => {
        /**
         * - Přizpůseobení velikosti a offsetu symbologie {@link symbol} měřítku a rotaci mapy.
         * @param symbol - Bodová symbologie.
         * @param geometry - Bod vůči kterému se přizpůsobuje geometrie.
         * @param rotation - Rotace symbologie {@link symbol} (bez ohledu na rotaci mapy). 
         */
        function handleSimbolOffset(symbol: __esri.Symbol, geometry: __esri.Point, rotation: number) {
            try {
                if (moduleLoaderRef.current.isLoaded && params.defaultSymbol.type === "picture-marker" && "picture-marker" === symbol.type) {
                    const defaultPictureMarkerSymbol = params.defaultSymbol as __esri.PictureMarkerSymbol;
                    
                    let yoffset = defaultPictureMarkerSymbol.yoffset || 0,
                        xoffset = defaultPictureMarkerSymbol.xoffset || 0;

                    const pictureMarkerSymbol = symbol as __esri.PictureMarkerSymbol;
                    if (params.sizeRenderer?.type === ESymbolRenderType.ScaleRatio) {
                        let sizeRatio = params.sizeRenderer.originScale / jimuMapView.view.scale;
                        yoffset *= sizeRatio;
                        xoffset *= sizeRatio;
                        pictureMarkerSymbol.width = (params.sizeRenderer.originWidth || defaultPictureMarkerSymbol.width) * sizeRatio;
                        pictureMarkerSymbol.height = (params.sizeRenderer.originHeight || defaultPictureMarkerSymbol.height) * sizeRatio;
                    }

                    if (!!yoffset || !!xoffset) {
                        rotation -= (params?.rotationInfo?.rotationDifference || 0);
    
                        if (rotationType === "arithmetic") {
                            rotation = RotationHelper.arithmeticToGeographic(rotation);
                        }
    
                        if (geometry.type === "point") {
                            const point = jimuMapView.view.toScreen(geometry);
                            const helpLine = new (moduleLoaderRef.current.getModule("Polyline"))({ spatialReference: geometry.spatialReference });
                            const help = jimuMapView.view.toScreen(jimuMapView.view.toMap(point));
                            help.x += xoffset;
                            help.y += yoffset;
                            helpLine.addPath([geometry, jimuMapView.view.toMap(help)]);
    
                            const rotatedPolyline = moduleLoaderRef.current.getModule('geometryEngine').rotate(helpLine, jimuMapView.view.viewpoint.rotation + rotation, helpLine.getPoint(0, 0)) as __esri.Polyline;
            
                            const screenHP = jimuMapView.view.toScreen(rotatedPolyline.getPoint(0, 1));
            
                            pictureMarkerSymbol.xoffset = point.x - screenHP.x;
                            pictureMarkerSymbol.yoffset = point.y - screenHP.y;
                        }
        
                    }   
                }
            } catch(err) {
                console.warn(err);
            }
        }

        onExtentChangeHandlerRef.current = () => {
            try {
                const symbol = (params.defaultSymbol as __esri.PictureMarkerSymbol | __esri.SimpleMarkerSymbol)?.clone();
                if ((symbol?.type === "picture-marker" || symbol?.type === "simple-marker")) {
                    if (params.feature && !!params.rotationInfo) {
        
                        symbol.angle = (params.feature.getAttribute(params.rotationInfo.rotationAttribute) || 0) + params.rotationInfo.rotationDifference;

                        if (rotationType === "arithmetic") {
                            symbol.angle = RotationHelper.arithmeticToGeographic(symbol.angle);
                        }
        
                        symbol.angle += jimuMapView.view.viewpoint.rotation;

                        handleSimbolOffset(symbol, params.feature.geometry as __esri.Point, parseFloat(params.feature.getAttribute(params.rotationInfo.rotationAttribute)) || 0);
    
                        params.feature.symbol = symbol;
                    } else if (params.isDrawing) {
                        handleSimbolOffset(symbol, jimuMapView.view.center, jimuMapView.view.viewpoint.rotation);
                        params.sketchModel.pointSymbol = symbol as any;
                    }
                }
            } catch(err) {
                console.warn(err);
            }
        };

        onRotateHandlerRef.current = () => {
            try {
                if (!!params.feature) {
                    /** - Bod, pomocí kterého se natáčí {@link params.feature}. */
                    let updateGraphic = params.sketchModel.layer.graphics.find(graphic => graphic.getAttribute(EConstants.rotationHelpAttrinbute));
                    const symbol = (params.defaultSymbol as __esri.PictureMarkerSymbol | __esri.SimpleMarkerSymbol)?.clone();
                    const geometry = params.feature.geometry as __esri.Point;
    
                    if (updateGraphic && (symbol.type === "picture-marker" || symbol.type === "simple-marker") && geometry.type === "point") {
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
    
                        rotation -= params.rotationInfo.rotationDifference;
                        
                        while (rotation < 0) {
                            rotation += 360;
                        }
    
                        params.feature.setAttribute(params.rotationInfo.rotationAttribute, rotation);
                        handleSimbolOffset(symbol, params.feature.geometry as __esri.Point, parseFloat(params.feature.getAttribute(params.rotationInfo.rotationAttribute)) || 0);
    
                        params.feature.symbol = symbol;
                    }
                }
            } catch(err) {
                console.warn(err);
            }
        };
    });

    /** - Naslouchání na změnu extentu mapy. */
    React.useEffect(() => {
        const extendListener = jimuMapView.view.watch("extent", () => {
            onExtentChangeHandlerRef.current();
        });

        return function() {
            extendListener.remove();
        }
    }, [jimuMapView, onExtentChangeHandlerRef]);

    /** - Naslouchání na pohnutí geometrie v {@link params.sketchModel}. */
    React.useEffect(() => {
        if (!!params.sketchModel) {
            const rotateListener = params.sketchModel.on("update", () => {
                onRotateHandlerRef.current();
            });

            return function() {
                rotateListener.remove();
            }
        }
    }, [params.sketchModel, onRotateHandlerRef]);
    
    /** - Pokud je {@link params.isRotating} true, tak se vytvoří bod, pomocí kterého je možno rotovat symbologií prvku {@link params.feature}. */
    React.useEffect(() => {
        try {

            if (params.isRotating && params.sketchModel && params.rotationInfo?.rotationAttribute && params.feature?.geometry?.type === "point" && moduleLoaderRef.current.isLoaded) {
                /** - Geometrie prvku {@link params.feature}. */
                const geometry = params.feature.geometry as __esri.Point;
                if (geometry.type !== "point") {
                    return;
                }

                /** - Barva symbologie pomocného bodu {@link helpPoint}. */
                const color = new (moduleLoaderRef.current.getModule("Color"))([255, 145, 0, 1]);
                /** - Bod, pomocí kterého je možno rotovat symbologií prvku {@link feature}. */
                const helpPoint = params.feature.clone()
    
                /** - Současná rotace symbologie prvku {@link params.feature}. */
                let rotation = (parseFloat(params.feature.getAttribute(params.rotationInfo.rotationAttribute)) || 0) + params.rotationInfo.rotationDifference;
                if (rotationType === "arithmetic") {
                    rotation = RotationHelper.arithmeticToGeographic(rotation);
                }
                
                /** - Čára 50 px severně od {@link feature}. */
                const polyline = new (moduleLoaderRef.current.getModule("Polyline"))({ paths: [[[geometry.x, geometry.y], [geometry.x, geometry.y + (jimuMapView.view.resolution * 50)]]], spatialReference: geometry.spatialReference });
                /** - {@link polyline} otočená a rotaci prvku {@link rotation}. */
                const rotatedPolyline = moduleLoaderRef.current.getModule("geometryEngine").rotate(polyline, -1 * rotation, geometry) as __esri.Polyline
    
                helpPoint.symbol = GeometryHelper.getSymbologySync("point",
                    {
                        SimpleFillSymbol: moduleLoaderRef.current.getModule("SimpleFillSymbol"),
                        SimpleLineSymbol: moduleLoaderRef.current.getModule("SimpleLineSymbol"),
                        SimpleMarkerSymbol: moduleLoaderRef.current.getModule("SimpleMarkerSymbol")
                    },
                    {
                        pointColor: color,
                        lineColor: color
                    }
                );
                helpPoint.setAttribute(EConstants.rotationHelpAttrinbute, true);
    
                /** - Koncový bod linie {@link rotatedPolyline} je poloha kde chceme pomocný bod {@link helpPoint}. */
                helpPoint.geometry = rotatedPolyline.getPoint(0, 1);
    
                params.sketchModel.layer.add(helpPoint);
    
                params.sketchModel.update(helpPoint, {
                    tool: "move"
                });
    
                return function() {
                    let updateGraphics = params.sketchModel?.layer?.graphics?.filter(graphic => graphic.getAttribute(EConstants.rotationHelpAttrinbute));
                    if (Array.isArray(updateGraphics)) {
                        params.sketchModel.layer.graphics.removeMany(updateGraphics);
                        for (let updateGraphic of updateGraphics) {
                            if (!updateGraphic.destroyed) {
                                updateGraphic.destroy();
                            }
                        }
                    }
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }, [params.sketchModel, params.isRotating, jimuMapView, params.rotationInfo?.rotationAttribute, params.rotationInfo?.rotationType, params.feature, params.rotationInfo?.rotationDifference, moduleLoaderRef, rotationType]);
}

interface ISymbologyRendererParams {
    /** - Výchozí symbol (bez rotace, změněné velikosti, atd.) pro prvek {@link feature}. */
    defaultSymbol: __esri.Symbol;
    /** - Informace o rotaci symbologie {@link defaultSymbol}. */
    rotationInfo: HSI.IRotationInfo;
    /** - Informace o způsobu vykreslování velikosti symbolu {@link defaultSymbol}. */
    sizeRenderer: HSI.ISymbolSizeRenderer;
    /**
     * - Může být v současné chvíli symbologií prvku {@link feature} rotováno?
     * - Má se vytvořit bod pro rotaci symbologií prvku {@link feature}?
     */
    isRotating: boolean;
    /** - Nástroj kreslení, ve kterém se bude zobrazovat bod, pomocí kterého se rotuje prvkem {@link feature}. */
    sketchModel: __esri.SketchViewModel;
    /** - Prvek kterým chceme rotovat. */
    feature: __esri.Graphic;
    /** - Probíhá zadávání bodu v mapě pomocí nástroje {@link sketchModel}? */
    isDrawing: boolean;
}