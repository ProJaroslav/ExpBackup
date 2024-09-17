import { React } from "jimu-core";
import { CalciteList, CalciteListItem } from "@esri/calcite-components-react";
import { FeatureTableHelper, EsriHelper } from "widgets/shared-code/helpers";
import { TableAction } from "widgets/shared-code/components";
import { useForceUpdate } from "widgets/shared-code/hooks";
const { useEffect } = React;

/** - Vypínání a zapínání viditelnosti sloupců v tabulce. */
export default function({ table, style }: HSI.FeatureTableComponent.IHideColumnsAction) {
    
    return <TableAction table={table} icon="show-column" style={style} >
        <HideColumnsAction table={table} />
    </TableAction>;
}

function HideColumnsAction({ table }: HSI.FeatureTableComponent.IHideColumnsAction) {
    const forceUpdate = useForceUpdate();

    //#region - Sledování změn ve sloupcích v tabulce.
    useEffect(() => {
        let isActive = true;
        /** - Sledování změn v pořadí a šířce sloupců v {@link table tabulce}. */
        let observers: Array<MutationObserver> = [];

        /** - Zrušení {@link observers sledování změn} sledování změn v pořadí a šířce sloupců v {@link table tabulce}. */
        function deleteObservers() {
            observers.forEach(observer => observer.disconnect());
            observers = [];
        }

        /** - Při změně sloupců se aktualizujě {@link observers sledování změn}. */
        function onColumnsChange() {
            deleteObservers();
            observers = FeatureTableHelper.updateColumnsObservers(table, forceUpdate);
        }

        const listeners = [FeatureTableHelper.onTableStateChange(table, state => {
            if (state === "loaded") {
                onColumnsChange()
            }
        })];

        FeatureTableHelper
            .onColumnChange(table, onColumnsChange)
            .then(onColumnChangeListener => {
                if (isActive) {
                    listeners.push(onColumnChangeListener);
                } else {
                    EsriHelper.removeListeners(onColumnChangeListener);
                }
            });

        return function() {
            EsriHelper.removeListeners(listeners);
            isActive = false;
            deleteObservers();
        }
    }, [table, forceUpdate]);
    //#endregion

    if (!table.columns || table.columns.length < 1) {
        return <></>;
    }
    
    return <CalciteList
        selectionMode="multiple"
        filterEnabled
        // dragEnabled
        // style={{
        //     maxHeight: 300,
        //     overflow: "auto",
        //     width: 200
        // }}
    >
        {
            table.columns
                .map(field => {
                    if ("fieldName" in field && "alias" in field) {
                        return <CalciteListItem
                            // style={{ order: field.get("order") }}
                            label={field.alias}
                            key={field.fieldName}
                            selected={!field["hidden"]}
                            value={`${field.fieldName}-${field.alias}`}
                            onClick={() => {
                                if (field["hidden"]) {
                                    table.showColumn(field.fieldName);
                                } else {
                                    table.hideColumn(field.fieldName);
                                }
                            }}
                        />;
                    } else {
                        return <></>;
                    }
                })
        }
    </CalciteList>
}