export function getOidFieldName(oidFieldName: string): string;
export function getOidFieldName(fields: Array<__esri.Field>): string;
export function getOidFieldName(fieldsOrFieldName: Array<__esri.Field> | string): string;
export function getOidFieldName(fieldsOrFieldName: Array<__esri.Field> | string): string {
    if (Array.isArray(fieldsOrFieldName)) {
        return getOidFieldName(fieldsOrFieldName.find(({ type }) => type === "oid").name);
    }
    return `${fieldsOrFieldName}_OLD`;
}

export function getDataSet(oid: number, table: __esri.FeatureTable): string {
    return table.viewModel.getValue(oid, "FEATURE_NAME") as string;
}

export function getOid(oid: number, fieldsOrFieldName: string, table: __esri.FeatureTable): number;
export function getOid(oid: number, fieldsOrFieldName: Array<__esri.Field>, table: __esri.FeatureTable): number;
export function getOid(oid: number, fieldsOrFieldName: Array<__esri.Field> | string, table: __esri.FeatureTable): number;
export function getOid(oid: number, fieldsOrFieldName: Array<__esri.Field> | string, table: __esri.FeatureTable): number {
    return table.viewModel.getValue(oid, getOidFieldName(fieldsOrFieldName)) as number;
}

export function getDatasetIds(table: __esri.FeatureTable): { [dataset: string]: Array<number>; } {
    const datasetIds: { [dataset: string]: Array<number>; } = {};

    table.highlightIds.forEach(oid => {
        let dataset = getDataSet(oid, table);

        if (!(dataset in datasetIds)) {
            datasetIds[dataset] = [];
        }

        datasetIds[dataset].push(getOid(oid, table.layer.objectIdField, table));
    });

    return datasetIds;
}