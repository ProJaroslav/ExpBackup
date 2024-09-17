import { React } from "jimu-core";
import { reducer, initializer, EStateChange } from "../helpers/treeStructureState";
import ITreeStructureState from "../interfaces/ITreeStructureState";;
import ILayerStructure from "../interfaces/ILayerStructure";
import VirtualLayerListContext from "../contexts/VirtualLayerListContext";
import { LayerDefinitionHelper, DbRegistryLoader, LayerHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { EConstants, EDbRegistryKeys } from "widgets/shared-code/enums";
import { Suspense } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import IMConfig from "../../IConfig";
import translations from "../translations/default";
import { JimuMapView, LayerTypes } from "jimu-arcgis";
import DependentVisibilityManager from "../helpers/DependentVisibilityManager";
const LayerItem = React.lazy(() => import("../components/LayerItem"));
const DataValidatorProvider = React.lazy(() => import("../components/DataValidatorProvider"));

/**
 * - Poskytuje vrstvu podle {@link layerDefinitions její definice}.
 * @todo - Dodělat i pro další typy vrstev.
 * @param jimuMapView - Aktivní view mapy.
 * @param layerDefinitions - Definice vrstvy.
 */
export async function findLayerByDefinition(jimuMapView: JimuMapView, layerDefinitions: HSI.DbRegistry.ILayerTreeStructureItem['dependentVisibilityLayers'][number]) {
    if (!layerDefinitions) {
        return;
    }
    if ("url" in layerDefinitions) {
        let wmsOrFeatureLayer: __esri.WMSLayer | __esri.FeatureLayer = await LayerDefinitionHelper.findWmsLayerByDefinition(jimuMapView, layerDefinitions);
        if (!wmsOrFeatureLayer) {
            wmsOrFeatureLayer = await LayerDefinitionHelper.findFeatureLayersByDefinition(jimuMapView, layerDefinitions);
        }

        return wmsOrFeatureLayer;
    } else {
        const mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, layerDefinitions);
        if (!mapImageLayer) {
            return;
        }

        if ("layerId" in layerDefinitions) {
            const sublayer = mapImageLayer.findSublayerById(layerDefinitions.layerId);
            if (!!sublayer) {
                return sublayer;
            }
        }
        return mapImageLayer;
    }
}

/**
 * - Naplnení {@link ITreeStructureState.layerStructure} {@link child vrstvou} a jejími potomky.
 * @param jimuMapView - Aktivní view mapy.
 * @param parentId - Unikátní id nadřazeného prvku ve stromové struktuře.
 * @param layerStructure - Stav stromové struktury.
 * @param child - Výchozí nastavení vrstvy.
 * @param virtualLayers - Kolekce virtuálních vrstev postupně/rekurzivně nalezených touto funkcí.
 * @returns Unikátní id pro {@link child}
 */
async function fillLayerStructure(jimuMapView: JimuMapView, parentId: string, layerStructure: ILayerStructure, child: HSI.DbRegistry.ILayerStructureItem, virtualLayers: Array<HSI.TableOfContentsWidget.IVirtualLayerDefinition>): Promise<string> {
    let uniqueId: string;
    if (!("virtual" in child)) {
        if ("url" in child.layer) {
            let layer: __esri.WMSLayer | __esri.FeatureLayer = await LayerDefinitionHelper.findWmsLayerByDefinition(jimuMapView, child.layer);
            if (!layer) {
                layer = await LayerDefinitionHelper.findFeatureLayersByDefinition(jimuMapView, child.layer);
            }
            if (!layer) {
                console.log(`Layer not found: ${JSON.stringify(child.layer)}`);
            } else {
                uniqueId = parentId + layer.id;
            }
        } else {
            const mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, child.layer);
            if (!mapImageLayer) {
                console.log(`Service not found: ${JSON.stringify(child.layer)}`);
            } else {
                uniqueId = parentId + mapImageLayer.id;
                if ("layerId" in child.layer) {
                    const sublayer = mapImageLayer.findSublayerById(child.layer.layerId);
                    if (!sublayer) {
                        console.log(`Layer not found: ${JSON.stringify(child.layer)}`);
                        uniqueId = null;
                    } else {
                        uniqueId = parentId + LayerHelper.geLayerstGisId(mapImageLayer.id, child.layer.layerId);
                    }
                }
            }
        }
    } else if (child.virtual) {
        const id = `virtual${virtualLayers.length}`;
        uniqueId = parentId + id;
        virtualLayers.push({
            id,
            title: child.layer.title
        });
    }

    if (!!uniqueId) {
        if (parentId) {
            layerStructure[parentId].sublayers.push(uniqueId);
        }
        layerStructure[uniqueId] = { expanded: child.expandedByDefault, sublayers: [] };
        
        if ("dependentVisibilityLayers" in child && Array.isArray(child.dependentVisibilityLayers) && child.dependentVisibilityLayers.length > 0) {
            Promise.all(
                child.dependentVisibilityLayers
                    .concat(child.layer)
                    .map(dependentVisibilityLayer => findLayerByDefinition(jimuMapView, dependentVisibilityLayer))
                    .filter(dependentVisibilityLayer => !!dependentVisibilityLayer)
            )
                .then(dependentVisibilityLayers => {
                    DependentVisibilityManager.register(dependentVisibilityLayers);
                })
                .catch(err => {
                    console.warn(err);
                });
        }

        if (Array.isArray(child.children)) {
            for (let offspring of child.children) {
                await fillLayerStructure(jimuMapView, uniqueId, layerStructure, offspring, virtualLayers);
            }
        }
    
        return uniqueId;
    }
}

/**
 * - Naplnení {@link ITreeStructureState.layerStructure} {@link sublayer podvrstvou} a jejími potomky.
 * @param parentId - Unikátní id nadřazeného prvku.
 * @param sublayer - Podvrstva.
 * @param layerStructure - Stav stromové struktury. 
 */
function fillLayerStructureBySublayer(parentId: string, sublayer: __esri.Sublayer, layerStructure: ILayerStructure): void {
    if (!sublayer) {
        return;
    }

    const uniqueId = parentId + LayerHelper.getGisIdLayersFromLayer(sublayer);
    layerStructure[parentId].sublayers.push(uniqueId);
    layerStructure[uniqueId] = { expanded: false, sublayers: [] };

    sublayer.sublayers?.toArray()?.reverse()?.forEach(child => fillLayerStructureBySublayer(uniqueId, child, layerStructure));
}

/** - Správce vrstev, Stromová struktura. */
export default function() {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const [state, dispatchState] = React.useReducer(reducer, jimuMapView, initializer);
    const [virtualLayers, setVirtualLayers] = React.useState<Array<HSI.TableOfContentsWidget.IVirtualLayerDefinition>>([]);
    const config = useConfig<IMConfig>();
    const messageFormater = useMessageFormater(translations);

    React.useEffect(() => {
        if (jimuMapView) {
            const abortController = new AbortController();

            (async function() {
                try {
                    const setting = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { scope: "g", type: "json", name: EDbRegistryKeys.TableOfContents });

                    const treeStructureState: ITreeStructureState = { baseLayers: [], layerStructure: {}, scale: jimuMapView.view.scale, canValidateData: false };

                    /** - Podařilo se sestavit stromovou strukturu podle konfigurace z DB? */
                    let isLayerStructureResolved = false;

                    if (!!config?.[EConstants.tocSettingKey]) {
                        if (Array.isArray(setting?.[config[EConstants.tocSettingKey]]?.layerStructure)) {
                            try {
                                const virtualLayers: Array<HSI.TableOfContentsWidget.IVirtualLayerDefinition> = [];
        
                                for (let layerSetting of setting[config[EConstants.tocSettingKey]].layerStructure) {
                                    let uniqueId = await fillLayerStructure(jimuMapView, "", treeStructureState.layerStructure, layerSetting, virtualLayers);
                                    if (!!uniqueId) {
                                        treeStructureState.baseLayers.push(uniqueId);
                                        isLayerStructureResolved = true;
                                    }
                                }
        
                                setVirtualLayers(virtualLayers);
                            } catch(err) {
                                console.warn(err);
                                treeStructureState.layerStructure = {};
                                NotificationHelper.addNotification({ message: messageFormater("failedToCreateLayerStructureFromBdRegistry"), type: "warning" });
                                isLayerStructureResolved = false;
                            }
                        }
                        
                        if (!!setting?.[config[EConstants.tocSettingKey]]?.dataValidity) {
                            treeStructureState.canValidateData = true;
                        }
                    }
                    
                    if (!isLayerStructureResolved) {
                        const mapImageLayers = await LayerHelper.getAllMapImageLayers(jimuMapView, true, abortController.signal);
                        const wmsLayers = LayerHelper.getAllLayersOfType(jimuMapView, LayerTypes.WMSLayer);
                        const featureLayers = LayerHelper.getAllLayersOfType(jimuMapView, LayerTypes.FeatureLayer);

                        treeStructureState.baseLayers = mapImageLayers
                            .map(mapImageLayer => mapImageLayer.id)
                            .toArray()
                            .reverse()
                            .concat(
                                wmsLayers
                                    .map(layer => layer.id)
                                    .toArray()
                                    .reverse());

                        mapImageLayers.forEach(mapImageLayer => {
                            treeStructureState.layerStructure[mapImageLayer.id] = { sublayers: [], expanded: true };
                            mapImageLayer.sublayers.toArray().reverse().forEach(sublayer => fillLayerStructureBySublayer(mapImageLayer.id, sublayer, treeStructureState.layerStructure));
                        });

                        wmsLayers.forEach(wmsLayer => {
                            treeStructureState.layerStructure[wmsLayer.id] = { sublayers: [], expanded: true };
                        });
                        
                        featureLayers.forEach(featureLayer => {
                            if (!featureLayer.isTable) {
                                treeStructureState.layerStructure[featureLayer.id] = { sublayers: [], expanded: true };
                            }
                        });
                    }

                    if (!abortController.signal.aborted) {
                        dispatchState({ type: EStateChange.OnJimuMapChange, jimuMapView, defaultState: treeStructureState });
                    }
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        NotificationHelper.addNotification({ message: messageFormater("failedToCreateLayerStructure"), type: "error" });
                    }
                }
            })();

            /** - Naslouchání na změnu měřítka mapy. */
            const listener = jimuMapView.view.watch("scale", scale => dispatchState({ type: EStateChange.OnScaleChange, scale }))

            return function() {
                listener.remove();
                abortController.abort();
            };
        }
    }, [jimuMapView, config?.[EConstants.tocSettingKey]]);

    if (!jimuMapView)
        return <></>;

    let render = <VirtualLayerListContext.Provider value={virtualLayers}>
        <LayerItem
            toggleExpand={gisId => dispatchState({ type: EStateChange.ToggleExpand, gisId })}
            treeStructureState={state}
            parentId=""
        />
    </VirtualLayerListContext.Provider>;

    if (state.canValidateData) {
        render = <DataValidatorProvider>
            {render}
        </DataValidatorProvider>;
    }

    return <Suspense>{render}</Suspense>;
}