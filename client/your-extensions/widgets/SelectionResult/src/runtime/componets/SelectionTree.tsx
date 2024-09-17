import { React } from "jimu-core";
import { Card, CardBody } from "jimu-ui";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import CreateRelationFeatureContext from "../contexts/CreateRelationFeatureContext";
import RelationUpdateContext from "../contexts/RelationUpdateContext";
import ReportGeneratorContext from "../contexts/ReportGeneratorContext";
import CreateRelationFeature, { ICreateRelationFeatureRef } from "./CreateRelationFeature";
import { IState } from "../helpers/widgetState";
import { useConfig, useHsiSelection } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { Suspense, ReportGeneratorModal } from "widgets/shared-code/components";
import { FeatureHelper } from "widgets/shared-code/helpers";
import translations from "../translations/default";

const LayerItem = React.lazy(() => import("./LayerItem"));
const TableItem = React.lazy(() => import("./TableItem"));

/** - Zobrazení výsledků výběru ve stromové struktuře. */
export default function(props: ISelectionTreeProps) {
    const selection = useHsiSelection({ populate: true });
    const createRelationFeatureRef = React.useRef<ICreateRelationFeatureRef>();
    const reportGeneratorRef = React.useRef<HSI.ReportComponent.IReportGeneratorModalMethods>();
    const jimuMapView = React.useContext(JimuMapViewContext);
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();
    const updateRelation = React.useContext(RelationUpdateContext);

    /** - GisId podvrstev, které jsou ve výběru, nebo ve kterých výběr probíhá. */
    const layerGisIds = Object.keys(selection.selection);
    /** - Id negrafických vrstev (tabulek), které jsou ve výběru, nebo ve kterých výběr probíhá. */
    const tableIds = Object.keys(selection.tableSelection);

    // Ujištění se, že zvolené (zvýrazněné v mapě) prvky jsou ve výběru.
    React.useEffect(() => {
        try {
            /** - Zrušení označení ve stromové struktuře. */
            const emptySelection = () => {
                props.onSelect({ type: ESelectedFeaturesType.Empty });
            }
    
            // Pokud je označená vrstva.
            if (props.selectedFeatures.type === ESelectedFeaturesType.Layer || props.selectedFeatures.type === ESelectedFeaturesType.Table) {
                const selectedGisId = props.selectedFeatures.id;
                /** - Prvky označené vrstvy ve výběru. */
                const features = selection.selection?.[selectedGisId]?.featureSet?.features || selection.tableSelection?.[selectedGisId]?.featureSet?.features || [];
                /** - Označení vrstvy ve stromové struktuře.. */
                const selectLayer = () => {
                    if (props.selectedFeatures.type === ESelectedFeaturesType.Layer) {
                        props.onSelect({
                            type: props.selectedFeatures.type,
                            geometryType: selection.selection[selectedGisId].featureSet.geometryType,
                            features,
                            id: selectedGisId
                        });
                    } else {
                        props.onSelect({
                            type: ESelectedFeaturesType.Table,
                            features,
                            id: selectedGisId
                        });
                    }
                }
    
                // Pokud označená vrstva nemá prvky ve výběru, tak zruší označení.
                if (!features.length) {
                    emptySelection();
                // Pokud prvky ve výběru neodpovídají zvoleným prvkům, tak je přepíšeme.
                } else if (features.length !== props.selectedFeatures.features.length) {
                    selectLayer();
                } else {
                    for (let feature of features) {
                        if (!props.selectedFeatures.features.includes(feature)) {
                            selectLayer();
                            break;
                        }
                    }
                }
            // - Pokud je označený prvek, zkontrolujeme zda je ve výběru
            } else if (props.selectedFeatures.type === ESelectedFeaturesType.Feature || props.selectedFeatures.type === ESelectedFeaturesType.TableFeature) {
                /** - Je označený prvek ve výběru? */
                let isInSelection = false;
                let featureSetsInSelection = props.selectedFeatures.type === ESelectedFeaturesType.Feature ? selection.selection : selection.tableSelection;
                for (let layerGisId in featureSetsInSelection) {
                    if (featureSetsInSelection[layerGisId]?.featureSet?.features?.includes(props.selectedFeatures.features[0])) {
                        isInSelection = true;
                        break;
                    }
                }
    
                if (!isInSelection) {
                    emptySelection();
                }
            // - Pokud je označený relační prvek, zkontrolujeme zda je nadřazený ve výběru.
            } else if (props.selectedFeatures.type === ESelectedFeaturesType.RelationFeature || props.selectedFeatures.type === ESelectedFeaturesType.RelationTableFeature) {
                /** - Je nadřazený prvek označeného prvku ve výběru? */
                let isInSelection = false;
                /** - Je vrstva, ze které pochází nadřazený prvek označeného prvku, grafickou podvrstvou? */
                let hasFoundLayer = false;
    
                for (let layerGisId of layerGisIds) {
                    /** - Pokud {@link props.selectedFeatures.id} začíná na {@link layerGisId}, tak to znamená, že původní(v první úrovni ve stromové struktuře) prvek pochází z podvrstvy {@link layerGisId}. */
                    if (props.selectedFeatures.id.startsWith(layerGisId)) {
                        hasFoundLayer = true;
                        if (Array.isArray(selection.selection[layerGisId]?.featureSet?.features)) {
                            for (let feature of selection.selection[layerGisId].featureSet.features) {
                                if (props.selectedFeatures.id.startsWith(`${layerGisId}_${FeatureHelper.getFeatureGisId(feature)}`)) {
                                    isInSelection = true;   
                                    break;
                                }
                            }
    
                        }
                        break;
                    }
                }
    
                if (!hasFoundLayer) {
                    for (let layerGisId of tableIds) {
                        /** - Pokud {@link props.selectedFeatures.id} začíná na {@link layerGisId}, tak to znamená, že původní(v první úrovni ve stromové struktuře) prvek pochází z negrafické vrstvy {@link layerGisId}. */
                        if (props.selectedFeatures.id.startsWith(layerGisId)) {
                            if (Array.isArray(selection.tableSelection[layerGisId]?.featureSet?.features)) {
                                for (let feature of selection.tableSelection[layerGisId].featureSet.features) {
                                    if (props.selectedFeatures.id.startsWith(`${layerGisId}_${FeatureHelper.getTableFeatureGisId(feature)}`)) {
                                        isInSelection = true;   
                                        break;
                                    }
                                }
        
                            }
                            break;
                        }
                    }
                }
    
                if (!isInSelection) {
                    emptySelection();
                }
            }
        } catch(err) {
            console.warn(err);
        }
    });

    // Zavření prvku / vrstvy a všech potomků ve stromové struktuře jestliže daný prvek/vrstva nejsou ve výběru.
    React.useEffect(() => {
        try {
            if (!config.keepTreeState) {
                const idsToClose: Array<string> = [];
    
                for (let layersState of Object.values(props.layersStates)) {
                    if (layersState?.expanded) {
                        if (!layerGisIds.includes(layersState.gisId) && !tableIds.includes(layersState.gisId)) {
                            idsToClose.push(layersState.id);
                        } else if (!!layersState.children) {
                            let features = (selection.selection[layersState.gisId] || selection.tableSelection[layersState.gisId])?.featureSet?.features || [];
                            let featureGisIds = features.map(feature => FeatureHelper.provideFeatureGisId(feature));
                            for (let featureState of Object.values(layersState.children)) {
                                if (!featureGisIds.includes(featureState.gisId)) {
                                    idsToClose.push(featureState.id);
                                }
                            }
                        }
                    }
                }
    
                if (idsToClose.length > 0) {
                    props.closeMultipleObjects(idsToClose);
                }
            }
        } catch(err) {
            console.warn(err);
        }
    });

    return <Card className="selection-tree">
        <CardBody>
            <CreateRelationFeatureContext.Provider value={createRelationFeatureRef}>
                <ReportGeneratorContext.Provider value={reportGeneratorRef}>
                    <Suspense>
                        {
                            layerGisIds.map(layerGisId => {
                                return <LayerItem
                                    key={layerGisId}
                                    gisId={layerGisId}
                                    onSelect={props.onSelect}
                                    featureSet={selection.selection[layerGisId].featureSet}
                                    isPending={selection.selection[layerGisId].isPending}
                                    selectedId={props.selectedFeatures.type === ESelectedFeaturesType.Empty ? null : props.selectedFeatures.id}
                                    layerState={props.layersStates[layerGisId]}
                                    toggleExpand={props.toggleExpand}
                                    loadRelationClasses={props.loadRelationClasses}
                                    loadRelationObjects={props.loadRelationObjects}
                                    loadedRelationClasses={props.loadedRelationClasses}
                                    loadedRelationObjects={props.loadedRelationObjects}
                                />;
                            })
                        }
                    </Suspense>
                    <Suspense>
                        {
                            tableIds.map(tableId => {
                                return <TableItem
                                    featureSet={selection.tableSelection[tableId].featureSet}
                                    isPending={selection.tableSelection[tableId].isPending}
                                    id={tableId}
                                    layerState={props.layersStates[tableId]}
                                    toggleExpand={props.toggleExpand}
                                    loadRelationClasses={props.loadRelationClasses}
                                    loadRelationObjects={props.loadRelationObjects}
                                    loadedRelationClasses={props.loadedRelationClasses}
                                    loadedRelationObjects={props.loadedRelationObjects}
                                    onSelect={props.onSelect}
                                    selectedId={props.selectedFeatures.type === ESelectedFeaturesType.Empty ? null : props.selectedFeatures.id}
                                />
                            })
                        }
                    </Suspense>
                </ReportGeneratorContext.Provider>
            </CreateRelationFeatureContext.Provider>
            <CreateRelationFeature ref={createRelationFeatureRef} />
            <ReportGeneratorModal
                ref={reportGeneratorRef}
                jimuMapView={jimuMapView}
                translations={translations}
                useTextInputs={config.useTextInputs}
                onFeatureCreated={(feature, relationshipClassId) => {
                    updateRelation([{ feature, relationshipClassId }]);
                }}
            />
        </CardBody>
    </Card>
};

type ISelectionTreeProps = Omit<HSI.SelectionResultWidget.ITreeItemCommonProps, "selectedId" | "level" | "parentId"> & Pick<IState, "layersStates" | "selectedFeatures"> & {
    /** - Hromadně zavře potomky prvků/vrstev ve stromové struktuře. */
    closeMultipleObjects: (id: Array<string>) => void;
};