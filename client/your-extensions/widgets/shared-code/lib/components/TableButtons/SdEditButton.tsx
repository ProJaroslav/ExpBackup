import { React } from "jimu-core";
import { SdCruButton } from "widgets/shared-code/components";
import { FeatureHelper } from "widgets/shared-code/helpers";
import { useMessageFormater, useTableSelectionCount } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";

const { useContext, useEffect, useRef } = React;

/**
 * - Tlačítko pro editaci prvku vybraného v tabulce.
 * - Práva editovat se reší uživatelskými rolemi.
 * - Použitelné asi pouze na SD.
 */
export default function({ sourceClass, children, provideLayer, tableRef, oidProvider, onEdited }: React.PropsWithChildren<HSI.FeatureTableComponent.ISdEditButton>) {
    const editButtonRef = useRef<HSI.FeatureTableComponent.IEditButtonMethods>();
    const jimuMapView = useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);
    const selectionCount = useTableSelectionCount(tableRef);

    const isDisabled = selectionCount !== 1;

    useEffect(() => {
        try {
            if (isDisabled && !!editButtonRef.current) {
                editButtonRef.current.close();
            }
        } catch(err) {
            console.warn(err);
        }
    }, [editButtonRef, isDisabled]);

    return <SdCruButton
        featureProvider={(layer, outFields) => {
            return oidProvider(tableRef.current, layer)
                .then(oid => {
                    return layer.queryFeatures({
                        objectIds: [oid],
                        outFields
                    });
                })
                .then(fetureSet => {
                    return { feature: fetureSet.features[0], fields: fetureSet.fields };
                });
        }}
        provideLayer={provideLayer}
        saveFeature={(feature, attributes) => {
            return FeatureHelper.applyEditsInTable(jimuMapView, { updates: [{
                table: sourceClass,
                attributes,
                objectId: feature.getObjectId()
            }] })
            .then(() => {
                tableRef.current.refresh();
                if (typeof onEdited === "function") {
                    onEdited(feature);
                }
            });
        }}
        sourceClass={sourceClass}
        disabled={isDisabled}
        ref={editButtonRef}
    >
        {children || messageFormater("editButton")}
    </SdCruButton>;
}