import { useHsiSelection } from "widgets/shared-code/hooks";

/**
 * - Poskytuje informaci zda je výběr prázdný (žádný prvek není ve výběru).
 * @param options - Rozšířené možnosti.
 */
export function useHsiSelectionEmpty(options: Pick<HSI.IUseHsiSelection, "jimuMapView"> = {}): boolean {
    const selection = useHsiSelection({ populate: true, jimuMapView: options.jimuMapView });

    for (let layerId in selection.selection) {
        if (selection.selection[layerId]?.featureSet?.features?.length > 0) {
            return false;
        }
    }

    for (let layerId in selection.tableSelection) {
        if (selection.tableSelection[layerId]?.featureSet?.features?.length > 0) {
            return false;
        }
    }

    return true;
}

export default useHsiSelectionEmpty;