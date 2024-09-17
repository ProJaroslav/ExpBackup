import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalHeader } from "jimu-ui";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { DbRegistryLoader, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { DynamicDataTable } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EDbRegistryKeys } from "widgets/shared-code/enums";
import translations from "../translations/default";
import { LayerTypes } from "jimu-arcgis";

const { useRef, useState, useEffect, useContext } = React;

/** - Tlačítko pro otevření okna s tabulkou rozdílové sestavy (v SAP ano, v GIS ne). */
export default function({ getWhereClause }: HSI.PropertyReportTableWidget.IDifferenceButtonProps) {
    const messageFormater = useMessageFormater(translations);
    const config = useConfig<HSI.PropertyReportTableWidget.IMConfig>();
    const tableRef = useRef<__esri.FeatureTable>();
    const [isOpen, toggleOpen] = useState<boolean>(false);
    const [tableTemplate, setTableTemplate] = useState<__esri.TableTemplate>();
    const jimuMapView = useContext(JimuMapViewContext);

    useEffect(() => {
        const abortController = new AbortController();

        Promise.all(([
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.FromData, scope: "g", type: "json" }),
            ArcGISJSAPIModuleLoader.getModule("TableTemplate")
        ]))
            .then(([formData, TableTemplate]) => {
                const differenceObjectClass = formData.objectClasses.find(({ objectClass }) => objectClass.toUpperCase() === config.differenceTable.toUpperCase());

                if (Array.isArray(differenceObjectClass?.fields)) {
                    setTableTemplate(new TableTemplate({
                        columnTemplates: differenceObjectClass.fields.map(({ name, alias }) => ({
                            type: "field",
                            initialSortPriority: 0,
                            fieldName: name,
                            label: alias,
                            direction: "asc"
                        }))
                    }));
                }
            });

        return function() {
            abortController.abort();
        }
    }, [jimuMapView, config.differenceTable]);

    return <>
        <Button onClick={() => {
            toggleOpen(true);
        }} >
            {messageFormater("differenceButton")}
        </Button>

        <Modal
            isOpen={isOpen}
            toggle={() => toggleOpen(false)}
            modalClassName="property-report-table-difference-modal"
            centered
        >
            <ModalHeader toggle={() => toggleOpen(false)} >{messageFormater("differenceModalHeader")}</ModalHeader>
            <ModalBody>
                <DynamicDataTable
                    dataSourceName={config.differenceTable}
                    serviceUrl={config.dynamicServiceUrl}
                    tableRef={tableRef}
                    tableSettingExtension="property-report-table-difference"
                    workspaceId={config.workspaceId}
                    tableTemplate={tableTemplate}
                    onLayerCreated={() => {
                        if (tableRef.current?.layer?.type === LayerTypes.FeatureLayer) {
                            tableRef.current.layer.definitionExpression = getWhereClause();
                        }
                    }}
                />
            </ModalBody>
        </Modal>
    </>;
}