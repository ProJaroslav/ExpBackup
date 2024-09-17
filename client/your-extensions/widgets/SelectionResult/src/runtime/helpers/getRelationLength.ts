import { ELoadStatus } from "widgets/shared-code/enums";
/**
 * - Zobrazení počtu záznamů v {@link relations relační třídě}.
 * @param relations - Stav relační třídy.
 */
export default function(relations: HSI.SelectionResultWidget.ILoadedRelationObjects[string]): string {
    if (relations?.state === ELoadStatus.Loaded) {
        return `(${Array.isArray(relations.result?.features) ? relations.result.features.length > 999 ? "1000+" : relations.result.features.length : 0})`;
    }

    return "";
}