import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { LayerHelper, FeatureTableHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
import { FeatureTable } from "widgets/shared-code/components";
const { useContext, useEffect, useReducer, useRef } = React;

/** - Tabulka pro zobrazení záznamů pomocí Dynamic Layers. */
export default function({ tableRef, dataSourceName, title, tableSettingExtension, serviceUrl, workspaceId, onCreated, onLayerCreated, tableTemplate, displayColumnMenus }: HSI.FeatureTableComponent.IDynamicDataTable) {
    const jimuMapView = useContext(JimuMapViewContext);
    const [isTableCreated, onTableCreated] = useReducer(() => true, false);
    const onLayerCreatedRef = useRef(onLayerCreated);
    const messageFormater = useMessageFormater(translations);

    useEffect(() => {
        onLayerCreatedRef.current = onLayerCreated;
    });

    useEffect(() => {
        if (!!dataSourceName && isTableCreated) {
            const abortController = new AbortController();

            (async function () {
                try {
                    const hasSettingExtension = !!tableSettingExtension;
                    const settingExtension = `${tableSettingExtension}_${dataSourceName}`;
                    const [layer, template] = await Promise.all([
                        LayerHelper.createDynamicDataSourceLayer(serviceUrl, workspaceId, dataSourceName),
                        !!tableTemplate ? Promise.resolve(tableTemplate) : hasSettingExtension && FeatureTableHelper.getSettingsBasedTemplate(jimuMapView, settingExtension)
                    ]);
                    
                    layer.title = title;
                    layer.definitionExpression = "1=2";

                    if (!abortController.signal.aborted) {

                        tableRef.current.layer = layer;

                        if (typeof onLayerCreatedRef.current === "function") {
                            onLayerCreatedRef.current();
                        }

                        if (!!hasSettingExtension) {
                            tableRef.current.tableTemplate = template;
                            FeatureTableHelper.setSaveSettingsButton(jimuMapView, tableRef.current, messageFormater("saveTableSettingsMenuButton"), settingExtension)
                        }
                    }
                } catch(err) {
                    console.warn(err);
                }
            })();

            return function() {
                abortController.abort();
            }
        }
    }, [serviceUrl, workspaceId, jimuMapView, dataSourceName, tableRef, title, tableSettingExtension, isTableCreated, onLayerCreatedRef, tableTemplate]);

    return <FeatureTable
        tableRef={tableRef}
        displayColumnMenus={displayColumnMenus}
        // tableSettingExtension={tableSettingExtension}
        // tableTemplate={tableTemplate}
        onCreated={() => {
            onTableCreated();
            if (typeof onCreated === "function") {
                onCreated();
            }
        }}
    />;
}