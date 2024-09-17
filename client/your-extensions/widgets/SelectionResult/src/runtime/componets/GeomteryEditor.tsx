import { React } from "jimu-core";
import { ButtonGroup, Button } from "jimu-ui";
import translations from "../translations/default";
import { useMessageFormater, usePointRotation } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { NotificationHelper, FeatureHelper, LayerHelper, ArcGISJSAPIModuleLoader, GeometryHelper, SketchHelper, RotationHelper } from "widgets/shared-code/helpers";

const ModuleLoader = new ArcGISJSAPIModuleLoader(["Color"]);

/** - Zobrazení a editace souřadnic jednotlivých vertexů prvku. */
export default React.memo(function(props: IGeometryProps) {
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);
    // Probíhá editace geometrie?.
    const [isEditing, toggleEditing] = React.useState<boolean>(false);
    // Probíhá editace geometrie?.
    const [isRotating, toggleRotating] = React.useState<boolean>(false);
    // Nastala v geometrii změna?.
    const [hasChanged, setHasChanged] = React.useState<boolean>(false);
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Reference nástroje pro úpravu geometrie. */
    const sketchRef = React.useRef<__esri.SketchViewModel>();
    /** - Reference GisId prvku. */
    const featureGisId = React.useRef<string>();
    /** - Informace o rotaci bodových prvků. */
    const rotationInfo = React.useMemo(() => {
        try {
            if (props.feature?.geometry?.type === "point") {
                const sublayer = LayerHelper.getSublayerFromFeature(props.feature);

                switch(sublayer?.renderer?.type) {
                    case "unique-value":
                        return RotationHelper.getRotationAttributeName(sublayer.renderer as __esri.UniqueValueRenderer, sublayer.fields);
                        break;

                    case "simple":
                        return RotationHelper.getRotationAttributeName(sublayer.renderer as __esri.SimpleRenderer, sublayer.fields);
                        break;
                    default:
                        console.warn(`Unhandled renderer type: ${sublayer.renderer.type}`);
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }, [props.feature]);
    /** - Reference kopie prvku pro editaci {@link props.graphic}. */
    const graphicRef = React.useRef<__esri.Graphic>();
    /** - Reference prvku označeného ve stromové struktuře {@link props.feature}. */
    const featureRef = React.useRef<__esri.Graphic>();

    /** - Naplnění referencí {@link graphicRef} a {@link featureRef}. */
    React.useEffect(() => {
        graphicRef.current = props.graphic;
        featureRef.current = props.feature;
    });

    usePointRotation(
        props.graphic,
        isEditing && isRotating && !props.isLoadingEditability,
        sketchRef.current,
        rotationInfo
    );

    /** - Zrušení editace geometrie včetně odebrání všech změn. */
    const cancelEdit = React.useCallback(() => {
        try {
            toggleEditing(false);
            toggleRotating(false);
            setHasChanged(false);
            if (sketchRef.current) {
                sketchRef.current.layer.removeAll();
                jimuMapView.view.map.remove(sketchRef.current.layer);
                sketchRef.current.cancel();
            }
    
            if (featureRef.current.geometry && graphicRef.current) {
                graphicRef.current.geometry = featureRef.current.geometry.clone();
                
                if (rotationInfo?.rotationAttribute) {
                    graphicRef.current.setAttribute(rotationInfo.rotationAttribute, featureRef.current.getAttribute(rotationInfo.rotationAttribute));
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }, [sketchRef, jimuMapView, graphicRef, featureRef, rotationInfo]);

    // Při změně prvku, se vytvoří jeho kopie pro editaci, a naplní se reference GisId.
    React.useEffect(() => {
        let isActive = true;

        featureGisId.current = FeatureHelper.getFeatureGisId(props.feature);

        (async function() {
            try {
                if (!ModuleLoader.isLoaded) {
                    await ModuleLoader.load();
                }
                const symbol = await GeometryHelper.getSymbology(props.feature.geometry.type, { color: new (ModuleLoader.getModule("Color"))(props.geometryColor || [255, 113, 33, 1]), fillOpacity: .2, pointSize: props.pointSize || 5 });
                const graphicCopy = props.feature.clone();
                graphicCopy.symbol = symbol;
                if (isActive) {
                    props.setGraphic(graphicCopy);
                }
            } catch(err) {
                console.warn(err);
            }
        })();

        return () => {
            isActive = false;
            cancelEdit();
            props.toggleSaving(false);
        };
    }, [props.feature, cancelEdit]);

    // Při změně mapy se vytvoří nástroj pro editaci geometrie a začne naslouchání na změnu geometrie.
    React.useEffect(() => {
        let isActive = true;
        const listeners: Array<IHandle> = [];

        ModuleLoader.load()
            .then(() => {
                const color = new (ModuleLoader.getModule("Color"))(props.geometryColor || [255, 113, 33, 1]);
                return Promise.all([
                    SketchHelper.loadSketch(jimuMapView, true),
                    GeometryHelper.getSymbology("point", { color, fillOpacity: .2, pointSize: props.pointSize || 5 }),
                    GeometryHelper.getSymbology("polygon", { color, fillOpacity: .2 }),
                    GeometryHelper.getSymbology("polyline", { color, fillOpacity: .2 })
                ])
            })
            .then(([sketch, pointSymbol, polygonSymbol, polylineSymbol]) => {
                if (isActive) {
                    sketch.pointSymbol = pointSymbol;
                    sketch.polygonSymbol = polygonSymbol;
                    sketch.polylineSymbol = polylineSymbol;
                    sketchRef.current = sketch;
                    // Při změně geometrie se aktualizuje kopie prvku.
                    listeners.push(
                        sketchRef.current.on("update", ev => {
                            if (ev.toolEventInfo?.type === "reshape-stop" || ev.toolEventInfo?.type === "move-stop" || ev.toolEventInfo?.type === "rotate-stop" || ev.toolEventInfo?.type === "vertex-add" || ev.toolEventInfo?.type === "vertex-remove") {
                                // props.setGraphic(ev.graphics[0].clone());
                                setHasChanged(true);
                            }
                        })
                    );
                        
                    // Naslouchání na zrušení poslední změny.
                    // listeners.push(
                    //     sketchRef.current.on("undo", ev => {
                    //         props.setGraphic(ev.graphics[0].clone())
                    //     })
                    // );
                }
            })
            .catch(err => {
                console.warn(err);
            });

        return () => {
            isActive = false;
            if (sketchRef.current && !sketchRef.current.destroyed) {
                sketchRef.current.destroy();
                jimuMapView.view.map.remove(sketchRef.current.layer);
            }

            listeners.forEach(listener => listener.remove());
        };
    }, [jimuMapView, sketchRef, props.setGraphic, props.geometryColor, props.pointSize]);

    // Ověření zda má geometie prvku křivky, pokud ano, tak zruší editaci.
    React.useEffect(() => {
        if (isEditing) {
            const abortController = new AbortController();
            (async function() {
                try {
                    props.toggleEditabilityLoading(true);

                    const containsCurves = await FeatureHelper.hasCurves(featureRef.current, abortController.signal);

                    props.toggleEditabilityLoading(false);

                    if (containsCurves) {
                        cancelEdit();
                        NotificationHelper.addNotification({ message: messageFormater("geometryHasCurves"), type: "info" });
                    }
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        props.toggleEditabilityLoading(false);
                    }
                }
            })();

            return function() {
                props.toggleEditabilityLoading(false);
                abortController.abort();
            }
        }

    }, [isEditing, props.toggleEditabilityLoading, featureRef, cancelEdit]);

    /** - Zahájení editace geometrie vybraného prvku. */
    function editGeometry() {
        try {
            cancelEdit();
            if (!isEditing) {
                toggleEditing(true);
                if (props.graphic.geometry.type !== "point") {
                    GeometryHelper.zoom(jimuMapView, [props.graphic]);
                } /*else {
                    const sublayer = getSublayerFromFeature(props.feature);
                    let symbol: __esri.Symbol;

                    switch(sublayer?.renderer?.type) {
                        case "unique-value":
                            let uniqueValueRenderer = sublayer.renderer as __esri.UniqueValueRenderer;
                            symbol = getUniqueValueFromFeature(props.feature, uniqueValueRenderer)?.symbol || uniqueValueRenderer.defaultSymbol;
                            break;
    
                        case "simple":
                            symbol = (sublayer.renderer as __esri.SimpleRenderer)?.symbol;
                            break;
                        default:
                            console.warn(`Unhandled renderer type: ${sublayer.renderer.type}`);
                    }

                    if (!!symbol) {
                        props.graphic.symbol = symbol;
                    }

                    let angle = (parseFloat(props.graphic.getAttribute(rotationInfo?.rotationAttribute)) || 0) + (rotationInfo?.rotationDifference || 0);

                    if (rotationInfo?.rotationType === "arithmetic") {
                        angle = arithmeticToGeographic(angle);
                    }

                    angle -= jimuMapView.view.viewpoint.rotation;

                    while (angle < 0) {
                        angle += 360;
                    }

                    (props.graphic.symbol as __esri.MarkerSymbol).angle = angle;
                }*/


                sketchRef.current.layer.add(props.graphic);
                jimuMapView.view.map.add(sketchRef.current.layer);
                sketchRef.current.update(props.graphic, {
                    tool: "reshape"
                });

            }
        } catch(err) {
            console.warn(err);
            cancelEdit();
        }
    }

    /** - Uložení změn geometrie. */
    async function saveChanges() {
        /** - GISID prvku, který ukládáme. */
        let gisId: string;
        try {
            gisId = FeatureHelper.getFeatureGisId(props.feature);
            if (!props.isLoadingEditability) {
                props.toggleSaving(true);
                await FeatureHelper.updateGeometry(
                    jimuMapView,
                    props.feature,
                    props.graphic.geometry,
                    rotationInfo?.rotationAttribute ? { ...rotationInfo, currentValue: props.graphic.getAttribute(rotationInfo.rotationAttribute) }: null
                );
                /** Pokud 'false', znamená to že se během ukládání změnila hodnota {@link props.feature}.*/
                if (gisId === featureGisId.current) {
                    cancelEdit();
                    props.toggleSaving(false);
                }
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: messageFormater("saveGeometryFailed"), type: "error" });
            /** Pokud 'false', znamená to že se během ukládání změnila hodnota {@link props.feature}.*/
            if (gisId === featureGisId.current) {
                props.toggleSaving(false);
            }
        }
    }

    return <ButtonGroup>
        <Button
            size="sm"
            active={isEditing}
            disabled={props.isSaving || props.isLoadingEditability}
            onClick={editGeometry}
        >
            {messageFormater("editGeometry")}
        </Button>
        {
            props.feature?.geometry?.type === "point" ? (
                <Button
                    size="sm"
                    active={isRotating}
                    disabled={props.isSaving || !isEditing || props.isLoadingEditability}
                    onClick={() => toggleRotating(rotating => !rotating)}
                >
                    {messageFormater("rotateGeometry")}
                </Button>
            ) : null
        }
        <Button
            size="sm"
            disabled={!hasChanged || props.isSaving || props.isLoadingEditability}
            onClick={saveChanges}
        >
            {messageFormater("saveGeometryChanges")}
        </Button>
        <Button
            size="sm"
            disabled={!hasChanged || props.isSaving || props.isLoadingEditability}
            onClick={() => {
                sketchRef.current.undo();
            }}
        >
            {messageFormater("backGeometryChanges")}
        </Button>
    </ButtonGroup>;
});

interface IGeometryProps extends Pick<HSI.DbRegistry.IEditabilityDbValue, "geometryColor" | "pointSize"> {
    /** - Prvek označený ve stromové struktuře. */
    feature: __esri.Graphic;
    /** - Kopie prvku pro editaci ({@link feature}). */
    graphic: __esri.Graphic;
    /** - Změna hodnoty {@link graphic}. */
    setGraphic: React.Dispatch<React.SetStateAction<__esri.Graphic>>;
    /** - Probíhá uládání změny geometrie?. */
    isSaving: boolean;
    /** - Změna hodnoty {@link isSaving}. */
    toggleSaving: (isSaving: boolean) => void;
    /** - Probíhá zjišťování editovatelnosti geometrie?. */
    isLoadingEditability: boolean;
    /** - Změna hodnoty {@link isLoadingEditability}. */
    toggleEditabilityLoading: (isSaving: boolean) => void;
};
