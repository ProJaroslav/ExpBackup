import { React } from "jimu-core";
import { DynamicDataTable } from "widgets/shared-code/components";
import { useConfig, useTableTemplate } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import { getOidFieldName } from "../helpers/tableHelper";
import { LayerTypes } from "jimu-arcgis";

const { useReducer, useEffect } = React;

/**
 * - Tabulka pro zobrazení Sestavy majetek.
 * - Sestavy majetek je pohled, takže nemá unikátní OID. Musím tedy vytvořit nové pole s honotami OID a podle s OID přepočítávat tak, aby bylo pro každý prvek unikátní.
 */
export default function({ tableRef, onCreated }: HSI.PropertyReportTableWidget.IEditTableProps) {
    const config = useConfig<HSI.PropertyReportTableWidget.IMConfig>();
    const tableTemplateState = useTableTemplate(config.reportTable);
    const [isTableLoaded, onTableLoaded] = useReducer(() => true, false);

    useEffect(() => {
        if (isTableLoaded && tableTemplateState.loadStatus === ELoadStatus.Loaded && tableRef.current.layer.type === LayerTypes.FeatureLayer) {
            const abortController = new AbortController();
            let queryFeatures: __esri.FeatureLayer['queryFeatures'];
            const layer = tableRef.current.layer;

            (async function() {
                try {
                    const [Field] = await Promise.all([
                        ArcGISJSAPIModuleLoader.getModule("Field"),
                        layer.load()
                    ]);
                    
                    const [highestOid] = await layer.queryObjectIds({
                        where: "1=1",
                        orderByFields: [`${layer.objectIdField} DESC`],
                        num: 1
                    }, { signal: abortController.signal });

                    const oidFieldCopy = new Field({
                        alias: layer.fields.find(field => field.type === "oid")?.alias,
                        name: getOidFieldName(layer.objectIdField),
                        type: "long"
                    });

                    layer.fields.push(oidFieldCopy);

                    if (Array.isArray(tableTemplateState.template.columnTemplates)) {
                        tableTemplateState.template.columnTemplates = tableTemplateState.template.columnTemplates.map(template => {
                            if (template.type === "field" && template.fieldName === layer.objectIdField) {
                                template.fieldName = oidFieldCopy.name;
                            }
                            
                            return template;
                        });
                    }

                    queryFeatures = layer.queryFeatures.bind(layer);

                    layer.queryFeatures = async (...args) => {
                        const featureSet = await queryFeatures(...args);

                        featureSet.fields.push(oidFieldCopy);
        
                        featureSet.features.forEach((feature, index) => {
                            feature.setAttribute(oidFieldCopy.name, feature.getObjectId());
                            feature.setAttribute(layer.objectIdField, feature.getObjectId() + highestOid + index + args[0].start);
                        });
        
                        return featureSet;
                    }

                    if (!abortController.signal.aborted) {
                        tableRef.current.tableTemplate = tableTemplateState.template;
                    }

                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                    }
                }
            }) ();

            return function() {
                abortController.abort();
                if (typeof queryFeatures === "function" && tableRef.current?.layer?.type === LayerTypes.FeatureLayer) {
                    tableRef.current.layer.queryFeatures = queryFeatures;
                }
            }
        }
    }, [tableTemplateState, config, isTableLoaded, tableRef]);

    return <DynamicDataTable
        tableRef={tableRef}
        dataSourceName={config.reportTable}
        serviceUrl={config.dynamicServiceUrl}
        workspaceId={config.workspaceId}
        onLayerCreated={() => {
            onTableLoaded();
            if (typeof onCreated === "function") {
                onCreated();
            }
        }}
        tableSettingExtension="property-report-table"
    />;
}