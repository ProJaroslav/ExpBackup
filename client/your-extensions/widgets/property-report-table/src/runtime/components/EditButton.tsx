import { React } from "jimu-core";
import { Button } from "jimu-ui";
import { SdDynamicSourceEditButton } from "widgets/shared-code/components";
import { useConfig, useMessageFormater } from "widgets/shared-code/hooks";
import { EsriHelper, FeatureTableHelper } from "widgets/shared-code/helpers";
import translations from "../translations/default";

const { useEffect, useState } = React;

/** - Tlačítko pro otevření okna s editací vybraného prvku. */
export default function({ tableRef }: HSI.PropertyReportTableWidget.IEditButtonProps) {
    const messageFormater = useMessageFormater(translations);
    const [selectedId, setSelectionIds] = useState<number>(null);
    const config = useConfig<HSI.PropertyReportTableWidget.IMConfig>();

    useEffect(() => {
        if (!!tableRef.current) {
            const listeners = FeatureTableHelper.onSelectListeners(tableRef.current, () => {
                const oid = tableRef.current.highlightIds.length === 1 ? tableRef.current.highlightIds.getItemAt(0) : null;
                setSelectionIds(typeof oid === "string" ? parseInt(oid) : oid);
            });

            return function() {
                EsriHelper.removeListeners(listeners);
            }
        }
    }, [tableRef.current, !!tableRef.current, setSelectionIds]);

    if (!selectedId) {
        return <Button disabled>{messageFormater("editButton")}</Button>
    }

    return <SdDynamicSourceEditButton
        dynamicServiceUrl={config.dynamicServiceUrl}
        oid={tableRef.current.viewModel.getValue(selectedId, `${tableRef.current.layer.objectIdField}_OLD`) as number}
        sourceClass={`dnt.${tableRef.current.viewModel.getValue(selectedId, "FEATURE_NAME")}`}
        workspaceId={config.workspaceId}
        tableRef={tableRef}
    >{messageFormater("editButton")}</SdDynamicSourceEditButton>;
}