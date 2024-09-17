import { React, Immutable } from "jimu-core";
import { Modal, ModalBody, ModalFooter, ModalHeader, Button, Label, MultiSelect, Select, Option } from "jimu-ui";
import translations from "../translations/default";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import { RelationUpdateContext, IRelationUpdatePair } from "../contexts/RelationUpdateContext";
import { useMessageFormater, useHsiSelection, useDisplayFeature } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { NotificationHelper, FeatureHelper, DbRegistryLoader, RequestHelper, LayerHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, EContextMenuKeys, EKnownLayerExtension } from "widgets/shared-code/enums";
import "./CreateRelationFeature.scss";

/** - Dialog pro vytvoření relací mezi objekty. */
export default React.memo(React.forwardRef<ICreateRelationFeatureRef>(function(props, ref) {
    const [state, dispatchState] = React.useReducer(reducer, null, initializer);
    const messageFormater = useMessageFormater(translations);
    const selection = useHsiSelection({ populate: true });
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Konfigurace relací. */
    const [config, setConfig] = React.useState<Array<HSI.DbRegistry.IAttributeRelationship>>([]);
    const relationUpdate = React.useContext(RelationUpdateContext);
    const displayFeature = useDisplayFeature();

    /** - Načtení konfigurace relací {@link config} */
    React.useEffect(() => {
        const abortController = new AbortController();

        DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RelationshipQueries, scope: "g", type: "json" }, abortController.signal)
            .then(config => {
                setConfig(config?.attributeRelationships || []);
            })
            .catch(err => {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                }
            });

        return function () {
            abortController.abort();
        }
    }, [jimuMapView]);

    /** - Načtění metadat všech mapových služeb v mapě. */
    React.useEffect(() => {
        LayerHelper.getAllMapImageLayers(jimuMapView).forEach(mapImageLayer => {
            mapImageLayer.load();
        });
    }, [jimuMapView]);

    /** - Naplnění reference této komponenty ({@link ref}). */
    React.useImperativeHandle(ref, () => ({
        open(params) {
            try {
                let layer: __esri.Sublayer | __esri.FeatureLayer;
                if (params.featureType === ESelectedFeaturesType.TableFeature || params.featureType === ESelectedFeaturesType.RelationTableFeature) {
                    layer = LayerHelper.getTableFromFeature(params.feature);
                } else {
                    layer = LayerHelper.getSublayerFromFeature(params.feature);
                }
                layer.load()
                    .then(() => {
                        dispatchState({
                            ...params,
                            type: EStateChange.Open
                        });
                    })
                    .catch(err => {
                        console.warn(err);
                    });
            } catch(err) {
                console.warn(err);
            }
        }
    }), []);

    /**
     * - Zjišťujje zda podvrstva / negrafická vrstva, ze které pochází prvke {@link state.feature} odpovídá definici {@link definition}.
     * @param definition - Definice podvrstvy / negrafické vrstvy.
     */
    function matchDefinition(definition: HSI.ISublayerDefinition | HSI.ITableDefinition): boolean {
        switch(state.featureType) {
            case ESelectedFeaturesType.TableFeature:
            case ESelectedFeaturesType.RelationTableFeature:
                let table = LayerHelper.getTableFromFeature(state.feature);
                let mapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, table);
                return LayerHelper.getMapName(mapImageLayer) === definition.mapName && definition.mapServiceName === LayerHelper.getServiceName(mapImageLayer) && definition.layerId === table.layerId;
            case ESelectedFeaturesType.RelationFeature:
            case ESelectedFeaturesType.Feature:
                return LayerDefinitionHelper.matchSublayerDefinition(LayerHelper.getSublayerFromFeature(state.feature), definition);
            default:
                console.warn(`Unhandled feature type '${state.featureType}'`);
                return false;
        }
    }

    /** - Prvky ve výběru ke kterým lze vytvořit relaci, seskupené podle podvrstev. */
    const attributeRelationships: Array<IExtendedAttributeRelationship> = [];

    /** - Vytvoření relace mezi objekty. */
    async function createRelation() {
        try {
            if (state.isPending || !state.feature || !state.selectedIds?.length || !state.isOpened) {
                return;
            }
            dispatchState({ type: EStateChange.OnSaveStart });

            /** - Dotazy pro vytvoření relací. */
            const promises: Array<() => Promise<[IRelationUpdatePair, IRelationUpdatePair]>> = [];

            for (let attributeRelationship of attributeRelationships) {
                /** Prvky ke kterým se vytvoří relace s {@link state.feature}. */
                let features = attributeRelationship.features.filter(feature => state.selectedIds.includes(FeatureHelper.provideFeatureGisId(feature)));
                if (features.length > 0) {
                    let mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, attributeRelationship.destinationLayer);

                    const hasExtension = await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.RelationSoe);
                    if (!hasExtension) {
                        throw new Error(`Mapová služba '${mapImageLayer.title}' nemá napojenou potřebnou SOE '${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}'`);
                    }

                    promises.push(
                        ...features.map(feature => {
                            const body: ICreateAttributeRelationship = {
                                relationshipClassId: attributeRelationship.id,
                                firstLayer: attributeRelationship.isOrigin ? attributeRelationship.originLayer : attributeRelationship.destinationLayer,
                                secondLayer: attributeRelationship.isOrigin ? attributeRelationship.destinationLayer : attributeRelationship.originLayer,
                                firstFeature: { attributes: state.feature.attributes },
                                secondFeature: { attributes: feature.attributes }
                            };
    
                            const stringifiedBody: { [k in keyof ICreateAttributeRelationship]: string } =  {
                                firstFeature: JSON.stringify(body.firstFeature),
                                firstLayer: JSON.stringify(body.firstLayer),
                                secondFeature: JSON.stringify(body.secondFeature),
                                secondLayer: JSON.stringify(body.secondLayer),
                                relationshipClassId: body.relationshipClassId
                            };
    
                            return () => RequestHelper.jsonRequest<{ request: ICreateAttributeRelationship}>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}/Relationships/CreateAttributeRelationship`, stringifiedBody)
                                .then(() => {
                                    const res: [IRelationUpdatePair, IRelationUpdatePair] = [{
                                        feature: state.feature,
                                        relationshipClassId: attributeRelationship.id
                                    }, {
                                        feature,
                                        relationshipClassId: attributeRelationship.id
                                    }];
                                    return res;
                                });
                        })
                    );
                }
            }

            const updatedFeatures: Array<[IRelationUpdatePair, IRelationUpdatePair]> = [];

            for (let promise of promises) {
                // Pokud se přidávání relací provádí paralelně, tak dotazy končí chybou 'The version has been redefined to reference a new database state.', viz https://hsi0916.atlassian.net/browse/LETGIS-324
                let result = await promise();
                updatedFeatures.push(result);
            }

            relationUpdate(updatedFeatures.reduce((arr, pair) => arr.concat(...pair), updatedFeatures[0]));

            dispatchState({ type: EStateChange.OnSaved });
            NotificationHelper.addNotification({ message: messageFormater("createRelationFeatureSuccess"), type: "success" });
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: messageFormater("createRelationFeatureFailed"), type: "error" });
            dispatchState({ type: EStateChange.OnSaveFailed });
        }
    }
    /**
     * - Nachází výběr podle identifikace podvrstvy.
     * @param definition - Identifikace podvrstvy.
     */
    function findRelationInSelection(definition: HSI.ISublayerDefinition | HSI.ITableDefinition): { featureSet: __esri.FeatureSet; isGraphic: boolean; } {
        for (let layergGisId in selection.selection) {
            let sublayer = LayerHelper.getSublayerByGisId(jimuMapView, layergGisId);
            if (LayerDefinitionHelper.matchSublayerDefinition(sublayer, definition)) {
                return {
                    featureSet: selection.selection[layergGisId].featureSet,
                    isGraphic: true
                };
            }
        }

        for (let tableId in selection.tableSelection) {
            let table = LayerHelper.getTableById(jimuMapView, tableId);
            let mapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, table);
            if (LayerHelper.getMapName(mapImageLayer) === definition.mapName && definition.mapServiceName === LayerHelper.getServiceName(mapImageLayer) && definition.layerId === table.layerId) {
                return {
                    featureSet: selection.tableSelection[tableId].featureSet,
                    isGraphic: false
                };
            }
        }

        return {
            featureSet: null,
            isGraphic: false
        }
    }

    // #region - Naplnění hodnoty attributeRelationships
    if (state.isOpened) {
        for (let attributeRelationship of config) {
            if (!Array.isArray(state.allowedRelations) || state.allowedRelations.includes(attributeRelationship.id)) {
                let features: Array<__esri.Graphic>;
                let label: string;
                const isOrigin = matchDefinition(attributeRelationship.originLayer);
    
                if (!isOrigin && !matchDefinition(attributeRelationship.destinationLayer)) {
                    continue;
                }
                if (isOrigin) {
                    var { featureSet, isGraphic } = findRelationInSelection(attributeRelationship.destinationLayer);
                    label = attributeRelationship.forwardLabel;
                } else {
                    var { featureSet, isGraphic } = findRelationInSelection(attributeRelationship.originLayer);
                    label = attributeRelationship.backwardLabel;
                }
    
                if (featureSet?.features?.length > 0) {
                    if (attributeRelationship.cardinality === "ManyToMany") {
                        features = [...featureSet.features];
                    } else {
                        if (isOrigin) {
                            features = featureSet.features.filter(feature => feature.getAttribute(attributeRelationship.originForeignKey) !== state.feature.getAttribute(attributeRelationship.originPrimaryKey));
                        } else {
                            features = featureSet.features.filter(feature => feature.getAttribute(attributeRelationship.originPrimaryKey) !== state.feature.getAttribute(attributeRelationship.originForeignKey));
                        }
                    }
                    if (features?.length > 0) {
                        features.sort((a, b) => displayFeature(a)?.localeCompare(displayFeature(b)));
                        attributeRelationships.push({
                            ...attributeRelationship,
                            features,
                            label,
                            isOrigin,
                            isGraphic
                        });
                    }
                }
            }
        }
    }
    //#endregion

    return <Modal isOpen={state.isOpened} toggle={() => dispatchState({ type: EStateChange.Close })} >
        <ModalHeader toggle={() => dispatchState({ type: EStateChange.Close })} >
            {messageFormater("createRelationFeatureHeader")}
        </ModalHeader>
        <ModalBody>
            <Label>{messageFormater("originFeatureLabel")}: {state.feature?.getAttribute(LayerHelper.getDisplayFieldSinc(LayerHelper.getSublayerFromFeature(state.feature)))} ({state.feature?.getObjectId()})</Label>

            {
                !attributeRelationships.length ? <h3>{messageFormater("createRelationNoRelevantFeature")}</h3>: <></>
            }

            {
                attributeRelationships.map(attributeRelationship => {
                    /** - GisId prvků {@link attributeRelationship.features} */
                    const featureGisIds = attributeRelationship.features.map(FeatureHelper.provideFeatureGisId.bind(FeatureHelper));
                    if (attributeRelationship.cardinality === "OneToOne" || (attributeRelationship.cardinality === "OneToMany" && !attributeRelationship.isOrigin)) {
                        return <Label className="inline-label">
                            {attributeRelationship.label}
                            <Select
                                size="sm"
                                value={state.selectedIds[0]}
                                onChange={ev => {
                                    dispatchState({ type: EStateChange.Select, ids: state.selectedIds.filter(id => !featureGisIds.includes(id)).concat(ev.target.value) });
                                }}
                            >
                                {
                                    attributeRelationship.features.map(feature => {
                                        let featureGisId = FeatureHelper.provideFeatureGisId(feature);
                                        return <Option
                                            value={featureGisId}
                                            key={featureGisId}
                                        >
                                            {displayFeature(feature)}
                                        </Option>;
                                    })
                                }
                            </Select>
                        </Label>;
                    }

                    if (attributeRelationship.cardinality === "OneToMany" || attributeRelationship.cardinality === "ManyToMany") {
                        return <Label className="inline-label">
                            {attributeRelationship.label}
                            <MultiSelect
                                size="sm"
                                items={Immutable(attributeRelationship.features.map(feature => {
                                    return {
                                        label: displayFeature(feature),
                                        value: FeatureHelper.provideFeatureGisId(feature)
                                    }
                                }))}
                                displayByValues={values => {
                                    if (!values?.length) { 
                                        return;
                                    }
                                    if (values.length === 1) {
                                        return messageFormater("miltiselectItemCount");
                                    }
                                    if (values.length < 5) {
                                        return messageFormater("miltiselectTwoToFourItemsCount").replace("{0}", values.length.toString());
                                    }
                                    return messageFormater("miltiselectItemsCount").replace("{0}", values.length.toString());
                                }}
                                values={Immutable(state.selectedIds.filter(id => featureGisIds.includes(id)))}
                                onClickItem={(ev, value, selectedValues: Array<string>) => {
                                    dispatchState({ ids: state.selectedIds.filter(id => !featureGisIds.includes(id)).concat(...selectedValues), type: EStateChange.Select });
                                }}
                            />
                        </Label>;
                    } 
                })
            }
        </ModalBody>
        <ModalFooter>
            <Button
                onClick={createRelation}
                disabled={state.isPending || !state.feature || !state.selectedIds.length || !state.isOpened}
            >
                {messageFormater("createRelationFeatureButton")}
            </Button>
        </ModalFooter>
    </Modal>;
}));

/**
 * - Rozhoduje o změně state.
 * @param state - Současné hodnoty state.
 * @param params - Parametry podle kterých se mění state.
 */
function reducer(state: IState, params: IStateChangeParams): IState {
    try {
        /** - Kopie hodnot state. */
        let stateCopy = { ...state };

        switch(params.type) {
            case EStateChange.Open:
                if (!params.feature) {
                    return initializer();
                }

                stateCopy.feature = params.feature;
                stateCopy.featureType = params.featureType;
                stateCopy.allowedRelations = params.allowedRelations;
                stateCopy.isOpened = true;

                return stateCopy;

            case EStateChange.Close:
                return initializer();

            case EStateChange.OnSaveFailed:
                if (!state.isPending) {
                    return state;
                }

                stateCopy.isPending = false;

                return stateCopy;

            case EStateChange.OnSaved:
                return initializer();

            case EStateChange.OnSaveStart:
                if (state.isPending || !state.feature || !state.selectedIds.length || !state.isOpened) {
                    return state;
                }

                stateCopy.isPending = true;

                return stateCopy;

            case EStateChange.Select:
                stateCopy.selectedIds = Array.isArray(params.ids) ? params.ids : [];

                return stateCopy;

            default:
                throw new Error(`Unhandled state change '${params['type']}'`)
        }
    } catch(err) {
        console.warn(err);
        return state;
    }
}

/** - Poskytuje výchozí hodnoty state. */
function initializer(): IState {
    return {
        feature: null,
        isOpened: false,
        isPending: false,
        selectedIds: [],
        featureType: null
    };
}

export interface ICreateRelationFeatureRef {
    open: (params: ICreateRelationFeatureOpenParams) => void;
}

type ICreateRelationFeatureOpenParams = Pick<IState, "feature" | "featureType" | "allowedRelations">;

interface IState extends Pick<HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.CreateRelation>, "allowedRelations"> {
    /** - Je dialog otevřený? */
    isOpened: boolean;
    /** - Prvek ke kterému se vytvářejí relace. */
    feature: __esri.Graphic;
    /** - Typ prvku ke kterému se vytvářejí relace. */
    featureType: ESelectedFeaturesType.Feature | ESelectedFeaturesType.TableFeature | ESelectedFeaturesType.RelationFeature | ESelectedFeaturesType.RelationTableFeature;
    /** - GisId zvolených prvků, ke kterým se vytvoří relace s {@link feature}. */
    selectedIds: Array<string>;
    /** - Probíhá vytváření relace? */
    isPending: boolean;
}

type IStateChangeParams = (
    (ICreateRelationFeatureOpenParams & { 
        /** - Typ změny state. */
        type: EStateChange.Open;
    }) | {
        /** - Typ změny state. */
        type: EStateChange.Close;
    } | {
        /** - Typ změny state. */
        type: EStateChange.OnSaveStart;
    } | {
        /** - Typ změny state. */
        type: EStateChange.OnSaved;
    } | {
        /** - Typ změny state. */
        type: EStateChange.OnSaveFailed;
    } | {
        /** - Typ změny state. */
        type: EStateChange.Select;
        /** - Nová hodnota {@link IState.selectedIds}. */
        ids: IState["selectedIds"];
    }
);

/** - Typy změn state. */
enum EStateChange {
    /** - Otevření dialogu. */
    Open,
    /** - Zavření dialogu. */
    Close,
    /** - Začalo vytváření relace. */
    OnSaveStart,
    /** - Relace úspěšně vytvořena . */
    OnSaved,
    /** - Nepodařilo se vytvořit relaci. */
    OnSaveFailed,
    /** - Výběr nové hodnoty {@link IState.selectedIds}. */
    Select
}

interface IExtendedAttributeRelationship extends HSI.DbRegistry.IAttributeRelationship {
    /** - Prvky ve výběru, na které není vytvořená relace. */
    features: Array<__esri.Graphic>;
    /** - Název vazby. */
    label: string;
    /** - Je vrstva, ze které pochází prvek {@link IState.feature}, v pozici {@link originLayer}? */
    isOrigin: boolean;
    /** - Jsou prvky {@link features} grafické (pocházejí z podvrstvy, ne z tabulky)? */
    isGraphic: boolean;
}

interface ICreateAttributeRelationship {
    /** - Jednoznačný technologický identifikátor relační třídy - definuje správce. */
    relationshipClassId: string;
    /** - Definice vrstvy ze které pochází prvek {@link firstFeature}. */
    firstLayer: HSI.ISublayerDefinition | HSI.ITableDefinition;
    /** - Definice vrstvy ze které pochází prvek {@link secondFeature}. */
    secondLayer: HSI.ITableDefinition | HSI.ISublayerDefinition;
    /** - Prvek pocházející z vrstvy {@link firstLayer}. */
    firstFeature: Pick<__esri.Graphic, 'attributes'>;
    /** - Prvek pocházející z vrstvy {@link secondLayer}. */
    secondFeature: Pick<__esri.Graphic, 'attributes'>;
}