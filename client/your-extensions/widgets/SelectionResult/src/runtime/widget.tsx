import { LayerTypes } from "jimu-arcgis";
import { React, AllWidgetProps, useIntl } from "jimu-core";
import { Card, CardBody } from "jimu-ui";
import { ArcGISJSAPIModuleLoader, GeometryHelper, FeatureHelper, LayerHelper, LayerDefinitionHelper, DbRegistryLoader, MutableStoreManagerHelper, RelationHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, ELoadStatus, EFeatureType } from "widgets/shared-code/enums";
import { WidgetWrapper } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { initializer, reducer, EStateChangeTypes } from "./helpers/widgetState";
import ESelectedFeaturesType from "./enums/ESelectedFeaturesType";
import BottomPane from "./componets/BottomPaneWrapper";
import { getSubLayerDefinitionFromFeature } from "./helpers/sublayerDefinition";
import SelectionTree from "./componets/SelectionTree";
import { IRelationUpdatePair, RelationUpdateContext } from "./contexts/RelationUpdateContext";
import SupportFeatureSetsContext from "./contexts/SupportFeatureSetsContext";
import "./widget.scss";

const ModuleLoader = new ArcGISJSAPIModuleLoader(["GraphicsLayer", "Color", "SimpleFillSymbol", "SimpleLineSymbol", "SimpleMarkerSymbol"]);

/**graphicLayerId
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget(props: AllWidgetProps<HSI.SelectionResultWidget.IMConfig>) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const graphicLayerId = `highlight-layer-${props.widgetId}`;
    const containerRef = React.useRef<HTMLDivElement>();
    const [state, dispatchState] = React.useReducer(reducer, null, initializer);
    const intl = useIntl();

    // Vykreslení geometrie zvoleného prvku / prvků ve zvolené vrstvě do mapy.
    React.useEffect(() => {
        /** - Grafická vrstva do které vykreslujeme geometrii vybraných prvků. */
        let graphicsLayer: __esri.GraphicsLayer; 
        let isActive = true;
        /** - Naslouchání na změnu geometrií v prvcích. */
        const listeners: Array<IHandle> = [];

        (async function () {
            try {
                if (
                    (jimuMapView && state.selectedFeatures.type !== ESelectedFeaturesType.Empty && state.selectedFeatures.type !== ESelectedFeaturesType.Table) ||
                    // Pokud je relační třída tabulka
                    (state.selectedFeatures.type === ESelectedFeaturesType.RelationClass && (!state.selectedFeatures.features[0] || FeatureHelper.getFeatureType(state.selectedFeatures.features[0]) === EFeatureType.Table))
                ) {
                    if (!ModuleLoader.isLoaded) {
                        await ModuleLoader.load();

                        if (!isActive) {
                            return;
                        }
                    }
                    
                    /** - Typ geometrie prvků {@link graphicsToDisplay}. */
                    let geometryType: __esri.FeatureSet['geometryType'];
                    /** - Prvky, které zobrazíme v mapě. */
                    let graphicsToDisplay: Array<__esri.Graphic>; 

                    // Pokud je vybrán negrafický prvek
                    if (state.selectedFeatures.type === ESelectedFeaturesType.TableFeature || state.selectedFeatures.type === ESelectedFeaturesType.RelationTableFeature) {
                        let gisId = FeatureHelper.getTableFeatureGisId(state.selectedFeatures.features[0]);
                        let featureSet = state.supportFeatureSets[gisId];
                        if (!featureSet) {
                            featureSet = await FeatureHelper.queryGeometryFeatures(jimuMapView, state.selectedFeatures.features[0], {
                                returnGeometry: true,
                                outFields: ["*"]
                            });

                            if (!featureSet) {
                                return;
                            }

                            dispatchState({ type: EStateChangeTypes.SupportFeaturesLoaded, id: gisId, featureSet });
                        }

                        geometryType = featureSet.geometryType;
                        graphicsToDisplay = featureSet.features;

                    } else if (state.selectedFeatures.type === ESelectedFeaturesType.Feature || state.selectedFeatures.type === ESelectedFeaturesType.RelationClass || state.selectedFeatures.type === ESelectedFeaturesType.Layer || state.selectedFeatures.type === ESelectedFeaturesType.RelationFeature) {
                        geometryType = state.selectedFeatures.geometryType;
                        graphicsToDisplay = state.selectedFeatures.features.map(feature => feature.clone());
                    }
    
                    graphicsLayer = jimuMapView.view.map.findLayerById(graphicLayerId) as __esri.GraphicsLayer;
                    if (!graphicsLayer) {
                        graphicsLayer = new (ModuleLoader.getModule("GraphicsLayer"))({ id: graphicLayerId });
                        jimuMapView.view.map.add(graphicsLayer);
    
                    } else if(graphicsLayer.type !== LayerTypes.GraphicsLayer) {
                        return;
                    }

                    const color = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.HighlightColor, type: "string", scope: "g" });

                    if (!isActive) {
                        return;
                    }    
    
                    // Při změně geometrie prvku se změní geometrie zvíraznění.
                    listeners.push(...state.selectedFeatures.features.map(feature => feature.watch("geometry", newGeometry => {
                        let graphic = graphicsLayer.graphics.find(graphic => graphic.getObjectId() === feature.getObjectId());
                        if (graphic) {
                            graphic.geometry = newGeometry;
                        }
                    })));
                    
                    const symbology = GeometryHelper.getSymbologySync(geometryType, {
                        SimpleFillSymbol: ModuleLoader.getModule("SimpleFillSymbol"),
                        SimpleLineSymbol: ModuleLoader.getModule("SimpleLineSymbol"),
                        SimpleMarkerSymbol: ModuleLoader.getModule("SimpleMarkerSymbol")
                    }, {
                        color: new (ModuleLoader.getModule("Color"))(color || [137, 96, 197, 1]),
                        fillOpacity: .2
                    });
                    
                    // Zvíraznění geometrií prvků v mapě.
                    graphicsLayer.addMany(
                        graphicsToDisplay.map(feature => {
                            feature.symbol = symbology;
                            return feature;
                        })
                    );
                }

            } catch(err) {
                console.warn(err);
            }
        })();

        return () => {
            isActive = false;
            if (graphicsLayer) {
                graphicsLayer.removeAll();
            }

            listeners.forEach(listener => listener.remove());
        }
    }, [state.selectedFeatures, jimuMapView, graphicLayerId, state.supportFeatureSets]);

    /** - Aktualizace hodnot atributů v prvcích a znovunačtění jejich relací. */
    async function updateFeatures(relationUpdatePairs: Array<IRelationUpdatePair>) {
        try {
            /** - Prvky u kterých aktualizujeme hodnoty atributů. */
            const featuresToUpdate = relationUpdatePairs.reduce<Array<__esri.Graphic>>((arr, feature) => {
                if (arr.includes(feature.feature)) {
                    return arr;
                }
                return arr.concat(feature.feature);
            }, []);
            
            //#region - Aktualizace hodnot relevantních prvků napříč stromovou strukturou (prvky ve výběru i relační prvky) 
            await Promise.all(featuresToUpdate.map(feature => {
                /** - Klíč skupiny prvků ve výběru ze které pochází {@link feature}. */
                let featureSetKey: string;
                /** - Vrstva/Podvrstva ze které pochází {@link feature}. */
                let layer: __esri.FeatureLayer | __esri.Sublayer;

                if (FeatureHelper.getFeatureType(feature) === EFeatureType.Table) {
                    layer = LayerHelper.getTableFromFeature(feature);
                    featureSetKey = MutableStoreManagerHelper.createTableKey(jimuMapView, layer);
                } else {
                    layer = LayerHelper.getSublayerFromFeature(feature);
                    featureSetKey = MutableStoreManagerHelper.createSublayerKey(jimuMapView, layer);
                }

                /** - Dotaz pro nov0 hodnoty prvku {@link feature}. */
                return layer.queryFeatures({
                    objectIds: [feature.getObjectId()],
                    returnGeometry: false,
                    outFields: ["*"]
                })
                    .then(featureSet => {
                        /** - Prvky z výběru i relační prvky, kterým nastavíme hodnoty podle vyhledaného prvku {@link featureSet}. */
                        let toUpdate: Array<__esri.Graphic> = [];

                        /** - Naplnění {@link toUpdate} odpovídajicími relačními prvky. */
                        for (let relationFeatureSet of Object.values(state.loadedRelationObjects)) {
                            let featureToUpdate = relationFeatureSet.result?.features?.find(f => FeatureHelper.provideFeatureGisId(feature) === FeatureHelper.provideFeatureGisId(f));
                            if (featureToUpdate) {
                                toUpdate.push(featureToUpdate);
                            }
                        }

                        let selectionFeatureSet = MutableStoreManagerHelper.getFeatureSet(featureSetKey);

                        /** - Naplnění {@link toUpdate} odpovídajicím prvkem z výběru. */
                        if (Array.isArray(selectionFeatureSet?.features)) {
                            let featureToUpdate = selectionFeatureSet.features.find(f => FeatureHelper.provideFeatureGisId(feature) === FeatureHelper.provideFeatureGisId(f));
                            if (featureToUpdate) {
                                toUpdate.push(featureToUpdate);
                            }
                        }

                        /** - Přepsání hodnot atributů prvkům {@link toUpdate}. */
                        for (let attributeName in featureSet.features[0].attributes) {
                            for (let featureToUpdate of toUpdate) {
                                featureToUpdate.setAttribute(attributeName, featureSet.features[0].getAttribute(attributeName));
                            }
                        }
                    });
            }));
            //#endregion

            dispatchState({
                type: EStateChangeTypes.DestroyRelationObjects,
                ids: relationUpdatePairs.map(relationUpdatePair => `${FeatureHelper.provideFeatureGisId(relationUpdatePair.feature)}_${relationUpdatePair.relationshipClassId}`)
            });
        } catch(err) {
            console.warn(err);
        }
    }

    /**
     * - Při kliknutí na lištu se začne měnit poměr velikostí hlavních částí widgetu.
     * @param ev - Událost kliknutí.
     */
     function onMouseDown(ev: React.MouseEvent<HTMLDivElement>): void {
        const handle = ev.currentTarget;
        const containerPosition = containerRef.current.getBoundingClientRect();
        const originBottom = containerPosition.bottom - handle.getBoundingClientRect().bottom;
        const start = ev.clientY;

        const resize = (e: MouseEvent): void => {
            if (!e.clientY) return;
            const difference = start - e.clientY;

            var bottom = originBottom + difference;

            if (bottom < 100)
                bottom = 100;

            if ((containerPosition.height - bottom) < 100)
                bottom = containerPosition.height - 100;

            containerRef.current.style.gridTemplateRows = `1fr ${bottom}px`;

            handle.style.bottom = `${bottom}px`;
        }

        const mouseup = () => {
            document.removeEventListener("mousemove", resize);
            document.removeEventListener("mouseup", mouseup);
        }


        document.addEventListener("mouseup", mouseup);
        document.addEventListener("mousemove", resize);
    }

    /**
     * - Načtení relačních tříd pro prvek {@link feature}.
     * @param feature - Prvek pro který načátáme relační třídy.
     */
    async function loadRelationClasses(feature: __esri.Graphic): Promise<void> {
        const id = FeatureHelper.provideFeatureGisId(feature);

        try {
            if (state.loadedRelationClasses[id]?.state === ELoadStatus.Loaded || state.loadedRelationClasses[id]?.state === ELoadStatus.Pending) {
                return;
            }

            dispatchState({ type: EStateChangeTypes.LoadedRelationClassesStart, id });

            const sourceSublayerDefinition = await getSubLayerDefinitionFromFeature(jimuMapView, feature);

            if (props.config.filledRelationsOnly) {
                let filledRelationsOnly = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.FilledRelationsOnly, scope: "u", type: "bool" });

                if (filledRelationsOnly !== false) {
                    const result = await RelationHelper.getReachableEvaluatedRelationships(jimuMapView, feature);

                    dispatchState({ type: EStateChangeTypes.LoadedEvaluatedRelationClassesSuccess, id, result });

                    return;
                }
            }
            /** - Relační trídy, které jsou v mapě. */
            const result = await RelationHelper.getReachableRelationships(jimuMapView, sourceSublayerDefinition, feature);

            dispatchState({ type: EStateChangeTypes.LoadedRelationClassesSuccess, id, result });

        } catch(error) {
            console.warn(error);
            dispatchState({ type: EStateChangeTypes.LoadedRelationClassesError, id, error });
        }
    }

    /**
     * Načtení navazbených prvků v relační třídě {@link relationshipClassId} pro prvek {@link feature}.
     * @param feature - Prvek pro který hledáme navazbené prvky.
     * @param relationshipClassId - Identifikátor relační třídy.
     */
    async function loadRelationObjects(feature: __esri.Graphic, relationshipClassId: string): Promise<void> {
        const featureGisId = FeatureHelper.provideFeatureGisId(feature);
        const id = `${featureGisId}_${relationshipClassId}`;
        try {
            const relationObject = state.loadedRelationObjects[id];
            const relationClass = state.loadedRelationClasses[featureGisId];
            if (relationObject?.state === ELoadStatus.Loaded || relationObject?.state === ELoadStatus.Pending || relationClass?.state !== ELoadStatus.Loaded) {
                return;
            }

            dispatchState({ type: EStateChangeTypes.LoadedRelationObjectsStart, id });

            const relationDefinition = relationClass.result.find(relationDefinition => relationDefinition.id === relationshipClassId);

            const mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, relationDefinition.layer);

            const result = await RelationHelper.fetchRelationObjects(jimuMapView, feature, relationshipClassId, mapImageLayer);

            if (Array.isArray(result?.features)) {
                result.features.sort((a, b) => FeatureHelper.displayFeature(a, { intl, featureSet: result }).localeCompare(FeatureHelper.displayFeature(b, { intl, featureSet: result })));
            }

            dispatchState({ type: EStateChangeTypes.LoadedRelationObjectsSuccess, id, result });
        } catch(error) {
            console.warn(error);
            dispatchState({ type: EStateChangeTypes.LoadedRelationObjectsError, id });
        }
    }

    return <Card className="widget-SelectionResult" >
        <CardBody>
            <RelationUpdateContext.Provider value={updateFeatures}>
                <div className="resize-wrapper" ref={containerRef}>
                    <SupportFeatureSetsContext.Provider value={state.supportFeatureSets}>
                        <SelectionTree
                            onSelect={selectedFeatures => dispatchState({ type: EStateChangeTypes.SelectFeatures, selectedFeatures })}
                            selectedFeatures={state.selectedFeatures}
                            layersStates={state.layersStates}
                            toggleExpand={objectDefiniton => dispatchState({ type: EStateChangeTypes.ToggleExpand, objectDefiniton })}
                            loadRelationClasses={loadRelationClasses}
                            loadRelationObjects={loadRelationObjects}
                            loadedRelationClasses={state.loadedRelationClasses}
                            loadedRelationObjects={state.loadedRelationObjects}
                            closeMultipleObjects={ids => dispatchState({ type: EStateChangeTypes.CloseMultipleObjects, ids })}
                        />
                    </SupportFeatureSetsContext.Provider>
                    
                    <BottomPane
                        selectedFeatures={state.selectedFeatures}
                    />

                    <div
                        className="size-handler"
                        onMouseDown={onMouseDown}
                        draggable={false}
                    ></div>
                </div>
            </RelationUpdateContext.Provider>
        </CardBody>
    </Card>;
}
  
export default WidgetWrapper(Widget, { usePopper: true, hasAssets: true, provideConfiguration: true, ignoreJimuMapView: false, urlParser: true });