import { ImmutableObject, IMState, React, ReactRedux, ImmutableArray, Immutable } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";

/** - Poskytuje GisId všech vybíratelných vrstev. */
export function useSelectableLayers(): ImmutableArray<string> {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const hsiSelectionState = ReactRedux.useSelector((state: IMState) => state.hsiSelection);
    if (!jimuMapView) {
        return Immutable([]);
    }

    const unpopulatedSelection: ImmutableObject<HSI.ISelectionSetState> = hsiSelectionState.selectionSetDictionary[SelectionManager.getSelectionSet(jimuMapView).selectionSetKey];

    return unpopulatedSelection.selectableLayers;
}

export default useSelectableLayers;