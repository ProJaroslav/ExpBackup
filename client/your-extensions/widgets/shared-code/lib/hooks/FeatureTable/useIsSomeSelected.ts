import { React } from "jimu-core";
import { EsriHelper, FeatureTableHelper } from "widgets/shared-code/helpers";
const { useState, useEffect } = React;

/**
 * - Poskytuje informaci zda je v {@link tableRef tabulce} vybrán nějaký prvek.
 * @param tableRef - Reference tabulky.
 */
export default function(tableRef: React.MutableRefObject<__esri.FeatureTable>): boolean {
    const [isSomeSelected, toggleSomeSelected] = useState<boolean>(false);

    useEffect(() => {
        if (!!tableRef.current) {
            const listeners = FeatureTableHelper.onSelectListeners(tableRef.current, () => {
                toggleSomeSelected(tableRef.current.highlightIds.length > 0);
            });

            return function() {
                EsriHelper.removeListeners(listeners);
            }
        }
    }, [tableRef.current, !!tableRef.current, toggleSomeSelected]);

    return isSomeSelected;
}