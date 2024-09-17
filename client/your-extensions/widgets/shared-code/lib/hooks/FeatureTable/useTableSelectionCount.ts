import { React } from "jimu-core";
import { EsriHelper, FeatureTableHelper } from "widgets/shared-code/helpers";
const { useState, useEffect } = React;

/**
 * - Poskytuje počet prvků vybraných v {@link tableRef tabulce}.
 * @param tableRef - Reference tabulky.
 */
export default function(tableRef: React.MutableRefObject<__esri.FeatureTable>): number {
    const [selectionCount, setSelectionCount] = useState<number>(0);

    useEffect(() => {
        if (!!tableRef.current) {
            const listeners = FeatureTableHelper.onSelectListeners(tableRef.current, () => {
                setSelectionCount(tableRef.current.highlightIds.length);
            });

            return function() {
                EsriHelper.removeListeners(listeners);
            }
        }
    }, [tableRef.current, !!tableRef.current, setSelectionCount]);

    return selectionCount;
}