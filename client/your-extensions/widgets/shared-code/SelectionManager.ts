import { JimuMapView } from "jimu-arcgis";
import SelectionSet from "widgets/shared-code/SelectionSet";
import { MutableStoreManagerHelper, SelectionHelper } from "widgets/shared-code/helpers";

export const HSI_MAIN_SELECTION_SET = "Výběr";

export default class SelectionManager {

    /**
     * - Poskytuje skupinu výběrů podle jejího unikátního názvu a JimuMapView ke kterému přísluší.
     * - JimuMapView je potřeba protože aplikace může mít více map, a výběr mezi mapami nelze sdílet.
     * @param jimuMapView - JimuMapView mapy. {@link https://developers.arcgis.com/experience-builder/api-reference/jimu-arcgis/JimuMapView}.
     * @param name - Název skupiny výběru.
     */
    public static getSelectionSet(jimuMapView: JimuMapView, name: string = HSI_MAIN_SELECTION_SET): SelectionSet {
        let key = SelectionHelper.getSelectionSetKey(jimuMapView, name);
        let selectionSet = MutableStoreManagerHelper.getSelectionSet(key);
        if (!selectionSet) {
            selectionSet = new SelectionSet(jimuMapView, name);
            MutableStoreManagerHelper.setSelectionSet(key, selectionSet);
        }
        
        return selectionSet;
    }
}