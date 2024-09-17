import { JimuMapView } from "jimu-arcgis";
import { ImmutableObject, IMState, React, ReactRedux } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { MutableStoreManagerHelper } from "widgets/shared-code/helpers";

/**
 * - Poskytuje současný stav výběru.
 * @param options - Rozšířené možnosti.
 */
export function useHsiSelection<T extends boolean = false>(options: HSI.IUseHsiSelection<T> = {}): HSI.IHsiSelection<T> {
    const jimuMapView = useJimuMapView(options);
    const hsiSelectionState = ReactRedux.useSelector((state: IMState) => state.hsiSelection);
    
    if (!jimuMapView) {
        return {
            isPending: false,
            selection: {},
            selectableLayers: [],
            tableSelection: {}
        };
    }

    const unpopulatedSelection: ImmutableObject<HSI.ISelectionSetState> = hsiSelectionState.selectionSetDictionary[SelectionManager.getSelectionSet(jimuMapView).selectionSetKey];

    if (!unpopulatedSelection) {
        return {
            isPending: false,
            selection: {},
            selectableLayers: [],
            tableSelection: {}
        };
    }

    if (!options.populate) {
        return unpopulatedSelection.asMutable({ deep: true });;
    }

    const populatedSelection: HSI.IHsiPopulatedSelection = {
        isPending: unpopulatedSelection.isPending,
        selection: {},
        selectableLayers: unpopulatedSelection.selectableLayers.asMutable({ deep: true }),
        tableSelection: {}
    };

    for (let layerGisId in unpopulatedSelection.selection) {
        populatedSelection.selection[layerGisId] = {
            isPending: unpopulatedSelection.selection[layerGisId].isPending,
            featureSet: MutableStoreManagerHelper.getFeatureSet(unpopulatedSelection.selection[layerGisId].featureSetId)
        };
    }

    for (let tableId in unpopulatedSelection.tableSelection) {
        populatedSelection.tableSelection[tableId] = {
            isPending: unpopulatedSelection.tableSelection[tableId].isPending,
            featureSet: MutableStoreManagerHelper.getFeatureSet(unpopulatedSelection.tableSelection[tableId].featureSetId)
        };
    }

    return populatedSelection;
}

export default useHsiSelection;

function useJimuMapView<T extends boolean = false>(options: HSI.IUseHsiSelection<T>): JimuMapView {
    const jimuMapViewFromContext = React.useContext(JimuMapViewContext);

    const jimuMapView = options.jimuMapView || jimuMapViewFromContext;

    return jimuMapView;
}