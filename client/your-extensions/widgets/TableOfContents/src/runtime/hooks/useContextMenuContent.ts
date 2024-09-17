import { React } from "jimu-core";
import ITreeStructureState from "../interfaces/ITreeStructureState";
import VirtualLayerListContext from "../contexts/VirtualLayerListContext";
import { WidgetStateHelper, LayerHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { EConstants, ESublayerType } from "widgets/shared-code/enums";
import { JimuMapViewContext, AssetsProviderContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
import { DataValidatorContext } from "../contexts/DataValidatorContext";

const checkIcon = require("jimu-ui/lib/icons/check.svg");
const closekIcon = require("jimu-ui/lib/icons/close.svg");

type IUseContextMenuContentParams = {
    /** - Stav stromové struktury. */
    treeStructureState: ITreeStructureState;
    /** - Unikátní identifikátor vrstvy v rámci celé stromové struktury. */
    id: string;
} & (
    {
        /** - Typ vrstvy. */
        layerType: "map-image-layer";
        /** - Vrstva nad níž se vyvolalo kontextové menu. */
        layer: __esri.MapImageLayer;
    } | {
        /** - Typ vrstvy. */
        layerType: "sublayer";
        /** - Podvrstva nad níž se vyvolalo kontextové menu. */
        layer: __esri.Sublayer;
        /** - Typ podvrstvy. */
        sublayerType: ESublayerType;
        /** - Je podvrstva vybíratelná? */
        isSelectable: boolean;
    } | {
        /** - Typ vrstvy. */
        layerType: "virtual";
        /** - identifikátor virtuální vrstvy. */
        layerId: string;
    } | {
        /** - Typ vrstvy. */
        layerType: "wms";
        /** - Vrstva nad níž se vyvolalo kontextové menu. */
        layer: __esri.WMSLayer;
    } | {
        /** - Typ vrstvy. */
        layerType: "feature";
        /** - Vrstva nad níž se vyvolalo kontextové menu. */
        layer: __esri.FeatureLayer;
    }
);

/** - Poskytuje obsah kontextové nabídky na vrstvou/podvrstvou. */
export default function(params: IUseContextMenuContentParams): Array<HSI.IPopperListItem> {
    /** - Id/GisId vrstvy/podvrstvy. */
    const layerId = params.layerType === "map-image-layer" ? params.layer.id : params.layerType === "sublayer" ? LayerHelper.getGisIdLayersFromLayer(params.layer) : params.layerType === "virtual" ? params.layerId : params.layerType === "wms" ? params.layer.id : null;
    /** - Id/GisId přímích potomků ve stromové struktuře. */
    const sublayerIds = Array.isArray(params.treeStructureState.layerStructure[params.id]?.sublayers) ? params.treeStructureState.layerStructure[params.id].sublayers : [];
    /** - Má vnořené potomky? */
    const hasChildren = sublayerIds.length > 0;
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Může mít zaplou vybíratelnost? (pouze podvrstvy) */
    const canBeSelectable = params.layerType === "sublayer" && (params.sublayerType === ESublayerType.Feature || params.sublayerType === ESublayerType.Annotation || params.sublayerType === ESublayerType.Dimension) 
    /** - Překlady textů. */
    const messageFormater = useMessageFormater(translations);
    /** - Poskytuje cestu k souboru uloženeho ve složce "assets". */
    const getAssetsPath = React.useContext(AssetsProviderContext);
    /** - Kolekce všech virtuálních vrstev. */
    const virtualLayerList = React.useContext(VirtualLayerListContext);
    const dataValidatorMethods = React.useContext(DataValidatorContext);

    /**
     * - Hromadné přepnutí viditelnosti podvrstev.
     * @param uniqueId Unikátní id (v rámci celé stromové struktury) vrstvy {@link layerId}.
     * @param layerId Id/GisId vrstvy/podvrstvy jejíž potomkům chceme změnít viditelnost.
     * @param visible - Mají být podvrstvy viditelné?
     */
    function toggleSublayersVisibility(uniqueId: string, layerId: string, visible: boolean): void {
        try {
            /** - Je vrstva {@link layerId} virtuální? */
            const isVirtual = virtualLayerList.findIndex(virtualLayer => virtualLayer.id === layerId) !== -1;
            let layer: __esri.Layer | __esri.Sublayer;
            
            if (!isVirtual) {
                layer = jimuMapView.view.map.findLayerById(layerId);
                if (!layer) {
                    try {
                        layer = LayerHelper.getSublayerByGisId(jimuMapView, layerId);
                    } catch(err) {
                        // Funkce 'getSublayerByGisId' vyhazuje chybu pokud GisId není platné, to nechceme.
                    }
                }
                if (layer) { 
                    layer.visible = visible;
                }
            }
            
            if (Array.isArray(params.treeStructureState.layerStructure[uniqueId]?.sublayers)) {
                for (let sublayerId of params.treeStructureState.layerStructure[uniqueId].sublayers) {
                    toggleSublayersVisibility(sublayerId, sublayerId.replace(uniqueId, ""), visible);
                }
            }
        } catch(err) {
            console.warn(err);
        }
    }

    /**
     * - Hromadné přepnutí vybíratelnosti podvrstev.
     * @param selectable - Mají být podvrstvy vybíratelné? 
     */
    async function toggleSublayersSelectability(selectable: boolean): Promise<void> {
        if (!hasChildren) {
            return;
        }
        const selectability: Array<HSI.SelectionStore.ILayerSelectability> = [];

        const addSelectability = (layerIds: Array<{ id: string, uniqueId: string }>) => {
            return Promise.all(layerIds?.map(async ids => {
                /** - Je vrstva {@link sublayerId} virtuální? */
                let isVirtual = virtualLayerList.findIndex(virtualLayer => virtualLayer.id === ids.id) !== -1;

                let layer: __esri.Layer = jimuMapView.view.map.findLayerById(ids.id);

                if (!layer && !isVirtual) {
                    let sublayer: __esri.Sublayer;
    
                    try {
                        sublayer = LayerHelper.getSublayerByGisId(jimuMapView, ids.id);
                    } catch(err) {
                        // Funkce 'getSublayerByGisId' vyhazuje chybu pokud GisId není platné, to nechceme.
                        return;
                    }
    
                    let type = await LayerHelper.getSubLayerTypeAsync(sublayer);
                    if (type === ESublayerType.Feature || type === ESublayerType.Annotation || type === ESublayerType.Dimension) {
                        selectability.push({
                            gisId: ids.id,
                            selectable
                        });
                    }
                }

                return addSelectability(params.treeStructureState.layerStructure[ids.uniqueId]?.sublayers?.map(uId => ({ uniqueId: uId, id: uId.replace(ids.uniqueId, "") })));
            })|| []);
        }

        await addSelectability(sublayerIds.map(uniqueId => ({ uniqueId, id: uniqueId.replace(params.id, "") })));
        
        SelectionManager.getSelectionSet(jimuMapView).setSelectability(selectability);
    }

    const contextMenu: Array<HSI.IPopperListItem> = [];

    if (params.layerType !== "virtual") {
        contextMenu.push({
            content: messageFormater("visibilityContextMenu"),
            onClick() {
                params.layer.visible = !params.layer.visible;
            },
            closeOnClick: true,
            icon: params.layer.visible ? checkIcon : closekIcon
        });
    }

    if (params.layerType === "sublayer" && canBeSelectable) {
        contextMenu.push({
            content: messageFormater("selectabilityContextMenu"),
            onClick() {
                SelectionManager.getSelectionSet(jimuMapView).setSelectability([{ gisId: layerId, selectable: !params.isSelectable }]);
            },
            icon: getAssetsPath(params.isSelectable ? "selectable-on.png" : "selectable-off.png"),
            closeOnClick: true
        });
    }

    if (hasChildren) {
        const subcontextMenu: Array<HSI.IPopperListItem> = [
            {
                content: messageFormater("sublayersVisibilityOnContextMenu"),
                closeOnClick: true,
                onClick() {
                    toggleSublayersVisibility(params.id, layerId, true);
                }
            },
            {
                content: messageFormater("sublayersVisibilityOffContextMenu"),
                closeOnClick: true,
                onClick() {
                    toggleSublayersVisibility(params.id, layerId, false);
                }
            },
            {
                content: messageFormater("sublayersSelectabilityOnContextMenu"),
                closeOnClick: true,
                onClick() {
                    toggleSublayersSelectability(true);
                }
            },
            {
                content: messageFormater("sublayersSelectabilityOffContextMenu"),
                closeOnClick: true,
                onClick() {
                    toggleSublayersSelectability(false);
                }
            }
        ];

        contextMenu.push({
            content: messageFormater("childrenContextMenu"),
            icon: getAssetsPath("folder-svgrepo-com.svg"),
            children: subcontextMenu
        })
    }

    //#region - Otevření widgetu metadata - LetGIS funkcionalita
    if (params.layerType === "sublayer" && WidgetStateHelper.containsWidgetWithName("DisplayWidgetMetadata")) {
        contextMenu.push({
            content: messageFormater("metadataContextMenu"),
            icon: WidgetStateHelper.getWidgetsByName("DisplayWidgetMetadata")[0].icon,
            onClick() {
                WidgetStateHelper.openWidgetsByName("DisplayWidgetMetadata");
                WidgetStateHelper.setWidgetStatePropByName("DisplayWidgetMetadata", EConstants.metadataActiveLayer, LayerHelper.getGisIdLayersFromLayer(params.layer))
            },
            closeOnClick: true
        });
    }
    //#endregion

    //#region - Potvrzení platnosti dat - LetGIS funkcionalita.
    if (params.layerType === "sublayer" && dataValidatorMethods.canValidate(params.layer)) {
        contextMenu.push({
            content: messageFormater("validateDataContextMenu"),
            closeOnClick: true,
            icon: getAssetsPath("success.svg"),
            onClick() {
                dataValidatorMethods.validate(params.layer);
            }
        });
    }
    //#endregion

    return contextMenu;
} 