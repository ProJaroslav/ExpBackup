import { JimuMapView } from "jimu-arcgis";
import { LayerHelper, NotificationHelper, MutableStoreManagerHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { EGeometrySelect, EGeometryType, ELoadStatus, ESelectInOption, ESelectionStateChange, ESelectionType, ESpatialRelation } from "widgets/shared-code/enums";
const SELECTION_STATE_INIT_KEY = "hsiGraphicSelectionStateInitialized";

export default class SelectionHelper {
    /**
     * - Vytváří unikátní klíč skupiny výběru složený z názvu skupiny a JimuMapView.
     * @param jimuMapView - JimuMapView mapy ke které skupina výběru je vytvořen.
     * @param selectionSetName - Název skupiny výběru.
     */
    public static getSelectionSetKey(jimuMapView: JimuMapView, selectionSetName: string): string {
        return `${jimuMapView.id}_${selectionSetName}`;
    }
    
    private static dispatchSelectionStateInternal(jimuMapView: JimuMapView, params: IStateChangeInternal): void {
        try {
            /** - Současné hodnoty state. */
            const currentState = MutableStoreManagerHelper.getGraphicSelectionState(jimuMapView);
            /** - Kopie hodnot state. */
            const stateCopy = { ...currentState };
    
            switch(params.type) {
                case ESelectionStateChange.LayersLoadStart:
                    stateCopy.loadingStatus = ELoadStatus.Pending;
    
                    break;
                case ESelectionStateChange.LayersLoadFailed:
                    stateCopy.loadingStatus = ELoadStatus.Error;
                    console.warn(params.exception);
                    NotificationHelper.addNotification({ message: "Při načítání seznamu vrstev nastala chyba", type: "error" });
    
                    break;
    
                case ESelectionStateChange.LayersLoaded:
                    stateCopy.loadingStatus = ELoadStatus.Loaded;
                    stateCopy.layerDictionary = {};
    
                    for (let layer of params.sublayers) {
                        let gisId = `${layer.layer.id}.${layer.id}`;
                        stateCopy.layerDictionary[gisId] = layer;
                    }
    
                    if (!Object.keys(stateCopy.layerDictionary).includes(stateCopy.selectedLayerId)) {
                        stateCopy.selectedLayerId = null;
                    }
    
                    break;
    
                case ESelectionStateChange.LayerVisibilityChanged:
                    stateCopy.loadingStatus = ELoadStatus.Loaded;
                    stateCopy.layerDictionary = {};
    
                    for (let layer of params.sublayers) {
                        let gisId = `${layer.layer.id}.${layer.id}`;
                        stateCopy.layerDictionary[gisId] = layer;
                    }
    
                    // if (!Object.keys(stateCopy.layerDictionary).includes(stateCopy.selectedLayerId)) {
                    //     stateCopy.selectedLayerId = null;
                    // }
    
                    break;
    
                case ESelectionStateChange.OnSelctButtonClicked:
                    SelectionHelper.canSelect(jimuMapView, currentState);
                    if (!currentState.canSelect) {
                        return;
                    }
    
                    if (![EGeometrySelect.Copy, EGeometrySelect.CopyAll, EGeometrySelect.Create].includes(currentState.activeGeometrySelect)) {
                        throw new Error(`Unhandled geometry select '${currentState.activeGeometrySelect}'`);
                    }
    
                    stateCopy.isSelecting = !currentState.isSelecting;
                    break;
    
    
                case ESelectionStateChange.OnGeometryDraw:
                    if (!currentState.keepActive) {
                        stateCopy.isSelecting = false;
                    }
    
                    break;
    
                case ESelectionStateChange.SelectInOption:
                    if (stateCopy.activeSelectInOption === params.selectedOption) {
                        return;
                    }
                    
                    stateCopy.activeSelectInOption = params.selectedOption;
    
                    break;
    
                case ESelectionStateChange.GeometrySelect:
                    if (stateCopy.activeGeometrySelect === params.geometrySelect) {
                        return;
                    }
                    
                    stateCopy.activeGeometrySelect = params.geometrySelect;
    
                    break;
    
                case ESelectionStateChange.GeometryType:
                    if (stateCopy.activeGeometryType === params.geometryType) {
                        return;
                    }
    
                    stateCopy.activeGeometryType = params.geometryType;
                    stateCopy.activeGeometrySelect = EGeometrySelect.Create;
                    break;
    
                case ESelectionStateChange.SelectFeature:
                    if (stateCopy.selectedFeature === params.feature) {
                        return;
                    }
    
                    stateCopy.selectedFeature = params.feature;
                    
                    if (stateCopy.selectedFeature) {
                        stateCopy.activeGeometrySelect = EGeometrySelect.Copy;
                    }
    
                    break;
    
                case ESelectionStateChange.SelectLayer:
                    if (stateCopy.selectedLayerId === params.gisId) {
                        return;
                    }
    
                    stateCopy.activeSelectInOption = ESelectInOption.Layer;
                    stateCopy.selectedLayerId = params.gisId;
    
                    break;
    
                case ESelectionStateChange.SelectionType:
                    if (currentState.selectionType === params.selectionType) {
                        return;
                    }
    
                    stateCopy.selectionType = params.selectionType;
                    break;                      
    
                case ESelectionStateChange.SelectionOperator:
                    if (currentState.selectionOperator === params.selectionOperator) {
                        return;
                    }
    
                    stateCopy.selectionOperator = params.selectionOperator;
                    break;     
    
                case ESelectionStateChange.Buffer:
                    if (typeof params.bufferSize !== "number" || currentState.bufferSize === params.bufferSize || params.bufferSize < 0) {
                        return;
                    }
    
                    stateCopy.bufferSize = params.bufferSize;
    
                    break;
    
                case ESelectionStateChange.SelectionChange:
                    SelectionHelper.canSelect(jimuMapView, stateCopy);
                    if (currentState.activeGeometrySelect !== EGeometrySelect.CopyAll || currentState.canSelect === stateCopy.canSelect) {
                        return;
                    }
                    break;
    
                case ESelectionStateChange.DrawBufferState:
                    if (params.drowBufferStatus === currentState.drowBufferStatus) {
                        return;
                    }
    
                    stateCopy.drowBufferStatus = params.drowBufferStatus;
                    break;
    
                case ESelectionStateChange.ToggleSelectionLock:
                    stateCopy.keepActive = !currentState.keepActive;
    
                    break;
    
                case ESelectionStateChange.AddSelectionType:
                    stateCopy.selectionType = currentState.selectionType === ESelectionType.Add ? ESelectionType.New : ESelectionType.Add;
                    if (params.lockAlong) {
                        stateCopy.keepActive = stateCopy.selectionType === ESelectionType.Add;
                    }
    
                    break;
    
                case ESelectionStateChange.DefaultSetting:
                    stateCopy.activeSelectInOption = ESelectInOption.Top;
                    stateCopy.activeGeometrySelect = EGeometrySelect.Create;
    
                    break;
    
                case ESelectionStateChange.OnCopyFeatureStart:
                    stateCopy.isSelecting = false;
                    break;
    
                case ESelectionStateChange.ForceEndSelection:
                    if (!currentState.isSelecting) {
                        return;
                    }
                    stateCopy.isSelecting = false;
                    break;
    
                default:
                    throw new Error(`Unhandled state change "${params['type']}"`);
            }
    
            SelectionHelper.canSelect(jimuMapView, stateCopy);
            MutableStoreManagerHelper.setGraphicSelectionState(jimuMapView, stateCopy);
        } catch(err) {
            console.error(err);
        }
    }
    
    public static dispatchSelectionState(jimuMapView: JimuMapView, params: IStateChange) {
        SelectionHelper.dispatchSelectionStateInternal(jimuMapView, params);
    }
    
    /**
     * - Poskytuje společný state pro widgety provádějicí grafický výběr.
     * @param jimuMapView - Aktivní view widgetu {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
     */
    public static getSelectionState(jimuMapView: JimuMapView): HSI.IGraphicSelectionState {
        if (!jimuMapView) {
            throw new Error(`Parameter 'jimuMapView' is not defined.`);
        }
    
        let selectionState = MutableStoreManagerHelper.getGraphicSelectionState(jimuMapView);
        if (!selectionState) {
            selectionState = {
                activeSelectInOption: ESelectInOption.Top,
                loadingStatus: ELoadStatus.Pending,
                layerDictionary: {},
                selectedLayerId: null,
                activeGeometryType: EGeometryType.Point,
                activeGeometrySelect: EGeometrySelect.Create,
                selectionType: ESelectionType.New,
                selectionOperator: ESpatialRelation.Intersects,
                isSelecting: false,
                canSelect: false,
                selectedFeature: null,
                bufferSize: 0,
                drowBufferStatus: ELoadStatus.Loaded,
                keepActive: false
            };
    
            if (jimuMapView.view?.map && !jimuMapView.view.map.get(SELECTION_STATE_INIT_KEY)) {
                MutableStoreManagerHelper.setGraphicSelectionState(jimuMapView, selectionState);
                SelectionHelper.handleVisibleSublayers(jimuMapView);
                jimuMapView.view.map.set(SELECTION_STATE_INIT_KEY, true)
            }
        }
    
        // if (selectionState.loadingStatus === ELoadStatus.Error) {
        //     handleVisibleSublayers(jimuMapView);
        // }
    
        // if (selectionState.sketchStatus === ELoadStatus.Error) {
        //     setSketch(jimuMapView);
        // }
    
        return selectionState;
    }
    
    /**
     * - Zajišťuje, že jsou ve state všechny viditelné podvrstvy typu "Feature Layer".
     * @param jimuMapView - Aktivní view widgetu {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
     */
    public static async handleVisibleSublayers(jimuMapView: JimuMapView): Promise<void> {
        try {
            SelectionHelper.dispatchSelectionStateInternal(jimuMapView, { type: ESelectionStateChange.LayersLoadStart });
            /** - Všechny MapImageLayers (mapové služby).  */
            const mapImageLayers = LayerHelper.getAllMapImageLayers(jimuMapView);
            /** - Všechny podvrstvy.  */
            const allSublayers = LayerHelper.getAllSublayers(jimuMapView);
            /** - Všechny podvrstvy typu "Feature Layer".  */
            const featureSublayers = await LayerHelper.getAllFeatureSublayers(jimuMapView);
    
            /** - Uložení všech viditelných podvrstvy typu "Feature Layer" do state. */
            const dispatchLayers = () => {
                SelectionHelper.dispatchSelectionStateInternal(jimuMapView, { 
                    type: ESelectionStateChange.LayerVisibilityChanged,
                    sublayers: featureSublayers.filter(sublayer => LayerHelper.isVisible(sublayer, jimuMapView.view.scale))
                });
            }
        
            //#region - Pokaždé, když se změní viditelnost jakékoli vrstvy nebo měřítko, tak se aktualizují vrstvy v state. 
            jimuMapView.view.watch("scale", dispatchLayers);
            mapImageLayers.forEach(mapImageLayer => mapImageLayer.watch("visible", dispatchLayers));
            allSublayers.forEach(sublayer => sublayer.watch("visible", dispatchLayers));
            //#endregion
        
            SelectionHelper.dispatchSelectionStateInternal(jimuMapView, { 
                type: ESelectionStateChange.LayersLoaded,
                sublayers: featureSublayers.filter(sublayer => LayerHelper.isVisible(sublayer, jimuMapView.view.scale))
            });
        } catch(exception) {
            SelectionHelper.dispatchSelectionStateInternal(jimuMapView, { type: ESelectionStateChange.LayersLoadFailed, exception });
        }
    }

    /**
     * - Ověření zda jsou splněny podmínky pro zahájení výběru.
     * @param jimuMapView - Aktivní view widgetu {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
     * @param state - Hodnoty state. 
     */
    private static canSelect(jimuMapView: JimuMapView, state: HSI.IGraphicSelectionState): void {
        if (state.activeSelectInOption === ESelectInOption.Layer && (!state.selectedLayerId || !(state.selectedLayerId in state.layerDictionary))) {
            state.canSelect = false;
        } else if (state.activeGeometrySelect === EGeometrySelect.Copy && (!state.selectedFeature || state.drowBufferStatus !== ELoadStatus.Loaded)) {
            state.canSelect = false;
        } else if (state.activeGeometrySelect === EGeometrySelect.CopyAll && (SelectionManager.getSelectionSet(jimuMapView).isGraphicEmpty || state.drowBufferStatus !== ELoadStatus.Loaded)) {
            state.canSelect = false;
        } else {
            state.canSelect = true;
        }

        if (!state.canSelect) {
            state.isSelecting = false;
        }
    }
};

/** - Možné změny state komponenty {@link Widget}. */
type IStateChange = (
    {
        /** - Typ změny state. */
        type: ESelectionStateChange.OnSelctButtonClicked;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.OnGeometryDraw;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.SelectInOption;
        /** - Nový způsob volby vrstev ve kterých se bude prováďet výběr. */
        selectedOption: ESelectInOption;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.GeometrySelect;
        /** - Způsob získaní geometrie podle které se prování výběr. */
        geometrySelect: EGeometrySelect;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.GeometryType;
        /** - Typ geometrie podle které se bude provádět výběr. */
        geometryType: EGeometryType;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.SelectFeature;
        /** - Prvek podle jehož geometrie se provede výběr. */
        feature: __esri.Graphic;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.SelectLayer;
        /** - GisId vrstvy ve které se bude prováďet výběr. */
        gisId: string;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.SelectionType;
        /** - Aplikacě výběru. */
        selectionType: ESelectionType;   
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.SelectionOperator;
        /** - Prostorový operátor. */
        selectionOperator: ESpatialRelation;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.Buffer;
        /** - Nová velikost obalové zóny (v metrech). */
        bufferSize: HSI.IGraphicSelectionState['bufferSize'];
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.SelectionChange;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.ToggleSelectionLock;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.DefaultSetting;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.OnCopyFeatureStart;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.AddSelectionType;
        /** - Má se přepnout i {@link IGraphicSelectionState.keepActive uzamčení aktivity výběru}? */
        lockAlong?: boolean;
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.ForceEndSelection
    } | {
        /** - Typ změny state. */
        type: ESelectionStateChange.DrawBufferState
    } & Pick<HSI.IGraphicSelectionState, 'drowBufferStatus'>
);

type IStateChangeInternal = IStateChange | {
    /** - Typ změny state. */
    type: ESelectionStateChange.LayersLoaded | ESelectionStateChange.LayerVisibilityChanged;
    /** - Seznam všech podvrstev v mapě ve kterých lze provádět výběr (všechny podvrstvy typu "Feature Layer"). */
    sublayers: Array<__esri.Sublayer>;
} | {
    /** - Typ změny state. */
    type: ESelectionStateChange.LayersLoadFailed;
    /** - Odchycená chyba. */
    exception: Error;
} | {
    /** - Typ změny state. */
    type: ESelectionStateChange.LayersLoadStart;
}