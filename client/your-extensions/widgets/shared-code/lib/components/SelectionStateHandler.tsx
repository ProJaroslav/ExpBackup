import { React, ReactRedux } from "jimu-core";
import { SelectionHelper, ArcGISJSAPIModuleLoader, GeometryHelper, SketchHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { useHsiSelectionDictionary, useHasArrayChanged } from "widgets/shared-code/hooks";
import { EGeometrySelect, EGeometryType, ELoadStatus, ESelectInOption, ESelectionStateChange } from "widgets/shared-code/enums";
    
export default React.memo(function() {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const state = ReactRedux.useSelector(() => SelectionHelper.getSelectionState(jimuMapView));
    const JSAPIModuleLoader = React.useMemo(() => new ArcGISJSAPIModuleLoader(['BufferParameters', "Graphic", "geometryService", "SimpleFillSymbol", "SimpleLineSymbol", "SimpleMarkerSymbol", "GraphicsLayer"]), []);
    const selection = useHsiSelectionDictionary({ jimuMapView });
    /** - Prvky ve výběru. */
    const features = React.useRef<Array<__esri.Graphic>>([]);
    /** - Grafická vrstva do kreré se vykresluje obalová zóna pro výběr. */
    const bufferGraphicsLayer = React.useRef<__esri.GraphicsLayer>();
    /** - Nástroj pro kreslení geometrie prostorového omezení výběru. */
    const [sketch, setSketch] = React.useState<__esri.SketchViewModel>();
    /** - Reference funkce, která provede prostorový výběr. */
    const spatialSelectionFunctionRef = React.useRef<(geometry?: __esri.Geometry) => Promise<void>>();
    features.current = !selection ? [] : Object.values(selection);

    const redrawBufferBecauseSelectionChanged = useRedrawBufferBecauseSelection(features.current, state.activeGeometrySelect);

    /** - Načtení nástroje pro kreslení geometrie prostorového omezení výběru {@link sketch} */
    React.useEffect(() => {
        const abortController = new AbortController();

        SketchHelper.loadSketch(jimuMapView)
            .then(sketch => {
                if (!abortController.signal.aborted) {
                    SketchHelper.transparentGeometry(jimuMapView, sketch);
                    setSketch(sketch);
                }
            })
            .catch(err => {
                console.warn(err);
            });
            
        return function() {
            abortController.abort();
        }
    }, [jimuMapView]);

    /** - Naplnění reference funkce, která provede prostorový výběr {@link spatialSelectionFunctionRef}. */
    React.useEffect(() => {
        spatialSelectionFunctionRef.current = async geometry => {
            try {
                let layerIds: string[] = [];
                const options: HSI.IGraphicSelectionOptions = { showPopUp: state.activeGeometryType === EGeometryType.Point && state.activeGeometrySelect === EGeometrySelect.Create };
        
                if (state.activeGeometrySelect !== EGeometrySelect.Create && state.bufferSize > 0) {
                    geometry = bufferGraphicsLayer.current.graphics.getItemAt(0).geometry; //Přebereme geometrii bufferu
                } else if (state.activeGeometrySelect === EGeometrySelect.Copy) {
                    geometry = state.selectedFeature.geometry;
                } else if (state.activeGeometrySelect === EGeometrySelect.CopyAll) {
                    const geometries = SelectionManager.getSelectionSet(jimuMapView).features.map(feature => feature.geometry);
                    if (Array.isArray(geometries) && geometries.length > 0) {
                        const geometriesGroupedByType: Array<Array<__esri.Geometry>> = [];
        
                        for (let geometry of geometries) {
                            const groupedGeometries = geometriesGroupedByType.find(g => g[0].type === geometry.type);
                            if (!groupedGeometries) {
                                geometriesGroupedByType.push([geometry]);
                            } else {
                                groupedGeometries.push(geometry);
                            }
                        }
                        
                        const [geometryServiceUrl, geometryService] = await Promise.all([
                            GeometryHelper.getGeometryServiceUrl(jimuMapView),
                            ArcGISJSAPIModuleLoader.getModule("geometryService")
                        ]);
        
                        if (geometriesGroupedByType.length === 1) {
                            geometry = await geometryService.union(geometryServiceUrl, geometries);
                        } else {
                            const BufferParameters = await ArcGISJSAPIModuleLoader.getModule("BufferParameters");
                            const polygons = await Promise.all(geometriesGroupedByType.map(groupedGeometries => {
                                return geometryService.buffer(geometryServiceUrl, new BufferParameters({
                                    geometries: groupedGeometries,
                                    distances: [0],
                                    unit: "meters",
                                    outSpatialReference: geometries[0].spatialReference,
                                    bufferSpatialReference: geometries[0].spatialReference,
                                    unionResults: true
                                }))
                                    .then(([buffer]) => buffer);
                            }));
                            geometry = await geometryService.union(geometryServiceUrl, polygons);
                        }
                    }
                }
        
                if (!geometry) {
                    throw new Error(`Missing geometry for graphic selection.`);
                }
            
                switch(state.activeSelectInOption) {
                    case ESelectInOption.Toc:
                        layerIds = Object.keys(state.layerDictionary);
                        options.selectableOnly = true;
                        options.vissibleOnly = true;
                        break;
                    case ESelectInOption.Top:
                        layerIds = Object.keys(state.layerDictionary);
                        options.selectableOnly = true;
                        options.vissibleOnly = true;
                        options.topOnly = true;
                        break;
                    case ESelectInOption.Layer:
                        layerIds = [state.selectedLayerId];
                        break;
            
                    default:
                        console.warn(`Unhandled select in option '${state.activeSelectInOption}'`)
                        break;
                }
                
                await SelectionManager.getSelectionSet(jimuMapView).graphicSelection(geometry, layerIds, state.selectionOperator, state.selectionType, options);
            } catch(err) {
                console.warn(err);
                NotificationHelper.addNotification({ message: "Při grafickém výběru nastala chyba.", type: "error" });
            }
        }
    });

    /** - Naslouchání na vykreslení geometrie, podle které se provede grafický výběr. */
    React.useEffect(() => {
        try {
            if (state.canSelect && state.isSelecting) {
                if (!!sketch && state.activeGeometrySelect === EGeometrySelect.Create) {
                        sketch.create(state.activeGeometryType);
        
                        const onDrawListener = sketch.on("create", ev => {
                            if (ev.state === "complete") {
                                SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.OnGeometryDraw });
                                spatialSelectionFunctionRef.current(ev.graphic?.geometry);
                                if (state.keepActive) {
                                    sketch.create(state.activeGeometryType);
                                }
                            } else if (ev.state === "cancel") {
                                SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.ForceEndSelection });
                            }
                        })

                        return function() {
                            onDrawListener.remove();
                            sketch.cancel();
                        }
                    } else {
                        SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.OnCopyFeatureStart });
                        spatialSelectionFunctionRef.current();
                    }
                }
            } catch(err) {
                console.warn(err);
            }
    }, [sketch, jimuMapView, state.canSelect && state.isSelecting, state.activeGeometrySelect, spatialSelectionFunctionRef, state.activeGeometryType, state.keepActive]);

    /** - Vytvoření obalové zóny pro výběr, a vykreslení do mapy. */
    React.useEffect(() => {
        const abortController = new AbortController();

        (async function () {
            try {
                if (state.bufferSize > 0 && state.activeGeometrySelect !== EGeometrySelect.Create) {
                    SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.DrawBufferState, drowBufferStatus: ELoadStatus.Pending });
                    if (!JSAPIModuleLoader.isLoaded) {
                        await JSAPIModuleLoader.load();
                    }

                    if (!bufferGraphicsLayer.current) {
                        bufferGraphicsLayer.current = new (JSAPIModuleLoader.getModule("GraphicsLayer"))({ title: "Selection Buffer", listMode: "hide" });
                        jimuMapView.view.map.add(bufferGraphicsLayer.current);
                    }

                    const [geometryServiceUrl, color] = await Promise.all([GeometryHelper.getGeometryServiceUrl(jimuMapView), SelectionManager.getSelectionSet(jimuMapView).getColor()]);

                    let geometries: Array<__esri.Geometry>;

                    if (state.activeGeometrySelect === EGeometrySelect.Copy && state.selectedFeature) {
                        geometries = [state.selectedFeature.geometry];
                    } else if (state.activeGeometrySelect === EGeometrySelect.CopyAll) {
                        geometries = features.current.map(feature => feature.geometry);
                    }
                    
                    if (Array.isArray(geometries) && geometries.length > 0 && !abortController.signal.aborted) {

                        const symbol = GeometryHelper.getSymbologySync("polygon", {
                            SimpleFillSymbol: JSAPIModuleLoader.getModule("SimpleFillSymbol"),
                            SimpleLineSymbol: JSAPIModuleLoader.getModule("SimpleLineSymbol"),
                            SimpleMarkerSymbol: JSAPIModuleLoader.getModule("SimpleMarkerSymbol")
                        }, { color, fillOpacity: .3, lineOpacity: .5, lineWidth: 2 });

                        const geometriesGroupedByType: Array<Array<__esri.Geometry>> = [];
    
                        for (let geometry of geometries) {
                            const groupedGeometries = geometriesGroupedByType.find(g => g[0].type === geometry.type);
                            if (!groupedGeometries) {
                                geometriesGroupedByType.push([geometry]);
                            } else {
                                groupedGeometries.push(geometry);
                            }
                        }
    
                        const buffers = await Promise.all(geometriesGroupedByType.map(groupedGeometries => {
                            return JSAPIModuleLoader.getModule("geometryService").buffer(geometryServiceUrl, new (JSAPIModuleLoader.getModule("BufferParameters"))({
                                geometries: groupedGeometries,
                                distances: [state.bufferSize],
                                unit: "meters",
                                outSpatialReference: geometries[0].spatialReference,
                                bufferSpatialReference: geometries[0].spatialReference,
                                unionResults: true
                            }), { signal: abortController.signal })
                                .then(([buffer]) => buffer);
                        }));
    
                        let buffer: __esri.Geometry;
    
                        if (buffers.length === 1) {
                            buffer = buffers[0];
                        } else {
                            buffer = await JSAPIModuleLoader.getModule("geometryService").union(geometryServiceUrl, buffers, { signal: abortController.signal });
                        }
    
                        if (!abortController.signal.aborted) {
                            bufferGraphicsLayer.current.add(new (JSAPIModuleLoader.getModule("Graphic"))({
                                geometry: buffer,
                                symbol
                            }));
                        }
                    }
                 
                    if (!abortController.signal.aborted) {
                        SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.DrawBufferState, drowBufferStatus: ELoadStatus.Loaded });
                    }
                }
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.DrawBufferState, drowBufferStatus: ELoadStatus.Error });
                }
            }
        })();

        return function() {
            abortController.abort();
            if (!!bufferGraphicsLayer.current) {
                bufferGraphicsLayer.current.removeAll();
            }
        }
    }, [state.bufferSize, state.activeGeometrySelect, JSAPIModuleLoader, jimuMapView, state.selectedFeature, redrawBufferBecauseSelectionChanged, bufferGraphicsLayer]);

    return <></>;
});

/**
 * - Hook, který změní návratohou hodnotu, pokud má dojít k překreslení bufferu pro výběr, kvůly změně ve výběru.
 * - Návratová hodnota neurčuje zda má dojít k překreslení.
 * - K překreslení dojde při změně hodnoty, protože změna bude detekována v poli závislostí.
 * @param features - Grafické prvky ve výběru.
 * @param activeGeometrySelect - Způsob získaní geometrie podle které se provádí výběr.
 */
function useRedrawBufferBecauseSelection(features: Array<__esri.Graphic>, activeGeometrySelect: HSI.IGraphicSelectionState['activeGeometrySelect']): boolean {
    /** - Reference hodnoty {@link shouldRedrawBufferBecauseSelection zde se má kvůli změně výběru překreslit buffer} při minulém renderu. */
    const shouldRedrawBufferBecauseSelectionPreviuseValue = React.useRef<boolean>(false);

    React.useEffect(() => {
        shouldRedrawBufferBecauseSelectionPreviuseValue.current = shouldRedrawBufferBecauseSelection;
    });

    /** - Došlo od posledního renderu ke změně výběru? */
    const hasSelectionChanged = useHasArrayChanged(features);
    /**
     * - Má se kvůli změně výběru překreslit buffer?
     * - Pokud {@link hasSelectionChanged došlo ke změně výběru} a geometrie se přebírá ze všech prvků ve výběru.
     */
    const shouldRedrawBufferBecauseSelection = hasSelectionChanged && activeGeometrySelect === EGeometrySelect.CopyAll;

    return shouldRedrawBufferBecauseSelection ? !shouldRedrawBufferBecauseSelectionPreviuseValue.current : shouldRedrawBufferBecauseSelectionPreviuseValue.current;
}