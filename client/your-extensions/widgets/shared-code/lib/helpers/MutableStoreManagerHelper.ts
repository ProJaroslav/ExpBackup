import { JimuMapView } from "jimu-arcgis";
import { MutableStoreManager } from "jimu-core";
import SelectionSet from "widgets/shared-code/SelectionSet";


export default class MutableStoreManagerHelper {
    private static readonly HSI_FEATURESET_KEY = "HsiMutableFeatureSetStore";
    private static readonly HSI_SELECTIONSET_KEY = "HsiMutableSelectionSetStore";
    private static readonly HSI_GRAPHIC_SELECTION_KEY = "HsiMutableGraphicSelectionStore";
    private static readonly OBJECT_STORAGE_KEY = "HsiObject";
    private static readonly FILLED_RELATIONS_ONLY_KEY = ["HsiHasFilledRelationsOnlyChanged", "value"];
    
    /**
     * - Uložení skupiny prvků do {@link MutableStoreManager}.
     * @param key - Klíč pod kterým chceme skupinu uložit.
     * @param featureSet - Skupina prvků.
     */
    public static storeFeatureSet(key: string, featureSet: __esri.FeatureSet): void {
        MutableStoreManager.getInstance().updateStateValue(MutableStoreManagerHelper.HSI_FEATURESET_KEY, key, featureSet);
    }
    
    /**
     * - Odebrání skupiny prvků z {@link MutableStoreManager}.
     * @param key - Klíč pod kterým je skupina uložena.
     */
    public static dropFeatureSet(key: string): void {
        if (key) {
            MutableStoreManagerHelper.storeFeatureSet(key, undefined);
        }
    }
    
    /**
     * - Načtění skupiny prvků z {@link MutableStoreManager}.
     * @param key - Klíč pod kterým je skupina uložena.
     */
    public static getFeatureSet(key: string): __esri.FeatureSet {
        return MutableStoreManager.getInstance().getStateValue([MutableStoreManagerHelper.HSI_FEATURESET_KEY, key]);
    }
    
    /**
     * - Vytváří klíč pod kterým by se měla ukládat skupina vybraných prvků do {@link storeFeatureSet}.
     * @param jimuMapView - JimuMapView mapy ze které  skupina prvků pochází.
     * @param sublayer - Podvrstva ze které skupina prvků pochází.
     */
    public static createSublayerKey(jimuMapView: JimuMapView, sublayer: __esri.Sublayer): string {
        return `${jimuMapView.id}_${sublayer.layer.id}_${sublayer.id}`;
    }
    
    /**
     * - Vytváří klíč pod kterým by se měla ukládat skupina vybraných prvků do {@link storeFeatureSet}.
     * @param jimuMapView - JimuMapView mapy ze které  skupina prvků pochází.
     * @param table - Negrafická vrstva (tabulka) ze které skupina prvků pochází.
     */
    public static createTableKey(jimuMapView: JimuMapView, table: __esri.FeatureLayer): string {
        return `${jimuMapView.id}_${table.id}`;
    }
    
    public static setSelectionSet(name: string, selectionSet: SelectionSet): void {
        MutableStoreManager.getInstance().updateStateValue(MutableStoreManagerHelper.HSI_SELECTIONSET_KEY, name, selectionSet);
    }
    
    public static getSelectionSet(name: string): SelectionSet {
        return MutableStoreManager.getInstance().getStateValue([MutableStoreManagerHelper.HSI_SELECTIONSET_KEY, name]);
    }
    
    public static getGraphicSelectionState(jimuMapView: JimuMapView): HSI.IGraphicSelectionState {
        return MutableStoreManager.getInstance().getStateValue([MutableStoreManagerHelper.HSI_GRAPHIC_SELECTION_KEY, jimuMapView.id]);
    }
    
    public static setGraphicSelectionState(jimuMapView: JimuMapView, state: HSI.IGraphicSelectionState): void {
        MutableStoreManager.getInstance().updateStateValue(MutableStoreManagerHelper.HSI_GRAPHIC_SELECTION_KEY, jimuMapView.id, state);
    }
    
    public static storeObject(key: string, object: any): void {
        window[key] = object;
        MutableStoreManager.getInstance().updateStateValue(MutableStoreManagerHelper.OBJECT_STORAGE_KEY, key, object);
    }
    public static getObject(key: string): any {
        let instance = MutableStoreManager.getInstance().getStateValue([MutableStoreManagerHelper.OBJECT_STORAGE_KEY, key]);
        if (!instance) {
            instance = window[key];
        } else if (key in window) {
            delete window[key];
        }
        return instance;
    }
    
    /** - Poskytuje informaci zda došlo ke změně nastavení {@link EDbRegistryKeys.FilledRelationsOnly způsobu získávání relací}. */
    public static hasFilledRelationsOnlyChanged(): boolean {
        return MutableStoreManager.getInstance().getStateValue(MutableStoreManagerHelper.FILLED_RELATIONS_ONLY_KEY);
    }
    
    /** - Uložení do globálníího stavu, že došlo ke změně nastavení {@link EDbRegistryKeys.FilledRelationsOnly způsobu získávání relací}. */
    public static onFilledRelationsOnlyChanged(): void {
        MutableStoreManager.getInstance().updateStateValue(MutableStoreManagerHelper.FILLED_RELATIONS_ONLY_KEY[0], MutableStoreManagerHelper.FILLED_RELATIONS_ONLY_KEY[1], true);
    }
};
