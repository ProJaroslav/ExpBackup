import { React, useIntl } from "jimu-core";
import { Table, FeatureTable } from "widgets/shared-code/components";
import { FeatureHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { useFieldAlias, useConfig, useMessageFormater } from "widgets/shared-code/hooks";
import { EFieldAlias } from "widgets/shared-code/enums";
import translations from "../translations/default";

const { useRef, useReducer, useEffect } = React;

/** - Obsah okna pasportizace. */
export default function({ fields, selectedFeature, sumFeatureSet, contracts, technicalUnits }: HSI.RevegetationWidget.IPasport) {
    const getFieldAlias = useFieldAlias(selectedFeature, EFieldAlias.default);
    const intl = useIntl();
    const config = useConfig<HSI.RevegetationWidget.IMConfig>();
    const messageFormater = useMessageFormater(translations);
    const tableRef = useRef<__esri.FeatureTable>();
    const tableTechnicUnitsRef = useRef<__esri.FeatureTable>();
    const [isTableLoaded, onTableLoad] = useReducer(() => true, false);

    useEffect(() => {
        if (isTableLoaded) {
            function getFields(result :typeof contracts): Array<__esri.FieldProperties> {
                const fields: Array<__esri.FieldProperties> = contracts.Columns
                    .map(({ Name, DataTypeName }) => ({
                        name: Name,
                        type: DataTypeName === "System.String" ? "string" : DataTypeName === "System.DateTime" ? "date" : "integer",
                        alias: Name
                    }));

                fields.push({
                    alias: "Index",
                    type: "oid",
                    name: "OID"
                });

                return fields;
            }

            (async function() {
                try {
                    const FeatureLayer = await ArcGISJSAPIModuleLoader.getModule("FeatureLayer");
                    tableRef.current.layer = new FeatureLayer({
                        title: messageFormater("contractTitle"),
                        source: contracts.Rows.map(({ ItemArray }, index) => {
                            const attributes = { OID: index };
                            for (let i = 0; ItemArray.length > i; i++) {
                                attributes[contracts.Columns[i].Name] = ItemArray[i];
                            }
                            return {
                                attributes
                            };
                        }),
                        fields: getFields(contracts),
                    });

                    tableTechnicUnitsRef.current.viewModel.highlightEnabled = false;
                    tableTechnicUnitsRef.current.layer = new FeatureLayer({
                        title: messageFormater("technicalUnitsTitle"),
                        definitionExpression: "1=2",
                        source: technicalUnits.Rows.map(({ ItemArray }, index) => {
                            const attributes = { OID: index };
                            for (let i = 0; ItemArray.length > i; i++) {
                                attributes[technicalUnits.Columns[i].Name] = ItemArray[i];
                            }
                            return {
                                attributes
                            };
                        }),
                        fields: getFields(technicalUnits)
                    });

                    tableRef.current.viewModel.autoRefreshEnabled = false;
                    tableRef.current.on("selection-change", () => {
                        if (tableRef.current.highlightIds.length > 0) {
                            if (tableRef.current.highlightIds.length > 1) {
                                tableRef.current.viewModel.deselectRows(tableRef.current.highlightIds.filter((_, i) => (i + 1) < tableRef.current.highlightIds.length).toArray());
                            }
                            tableTechnicUnitsRef.current.layer.definitionExpression = `smlouva_cislo = ${tableRef.current.viewModel.getValue(tableRef.current.highlightIds.getItemAt(0), "smlouva_cislo")}`;
                        } else {
                            tableTechnicUnitsRef.current.layer.definitionExpression = "1=2";
                        }
                    });

                } catch(err) {
                    console.warn(err);
                }
            })();
        }
    }, [isTableLoaded, contracts, technicalUnits, tableRef, tableTechnicUnitsRef]);

    return <div className="revegetation-pasport">
        <Table
            caption={messageFormater("pasportInfo")}
            rows={fields.map(field => [getFieldAlias(field), FeatureHelper.getFeatureValue(selectedFeature, field, { intl })])}
        />

        <Table
            caption={messageFormater("sumPasportInfo")}
            rows={function(): HSI.Table.ITableRows {
                const rows: Array<[string, number]> = [];
                const sumField = sumFeatureSet.fields.find(field => field.name === config.sumKindAttribute);
                if (sumField.domain?.type === "coded-value") {
                    sumField.domain.codedValues.forEach(({ code, name }) => {
                        const feature = sumFeatureSet.features.find(feature => feature.getAttribute(sumField.name) === code);
                        rows.push([name, !feature ? 0 : Math.ceil(feature.getAttribute(SUM_AREA_FIELD) / 100) / 100]);
                    });
                }
        
                return (rows as HSI.Table.ITableRows).concat([[
                    <span style={{ fontWeight: "bold" }}>{messageFormater("sumPasportLabel")}</span>,
                    <span style={{ fontWeight: "bold" }}>{rows.reduce((sum, [, value]) => sum + value, 0)}</span>
                ]]);
            }()}
        />

        <FeatureTable
            tableRef={tableRef}
            onCreated={onTableLoad}
        />

        <FeatureTable
            tableRef={tableTechnicUnitsRef}
        />
    </div>;
}

export const SUM_AREA_FIELD = "SUM_AREA";