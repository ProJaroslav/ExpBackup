import { useHsiSelection } from "widgets/shared-code/hooks";

/**
 * - Poskytuje velikost výběru.
 * @param options - Rozšířené možnosti.
 */
export function useHsiSelectionSize(options: Pick<HSI.IUseHsiSelection, "jimuMapView"> = {}): number {
    const selection = useHsiSelection({ populate: true, jimuMapView: options.jimuMapView });

    const selectionSize = Object.values(selection.selection).reduce((total, selection) => {
        return total + (selection?.featureSet?.features?.length || 0);
    }, 0);

    return Object.values(selection.tableSelection).reduce((total, selection) => {
        return total + (selection?.featureSet?.features?.length || 0);
    }, selectionSize);
}

export default useHsiSelectionSize;