import { type IntlShape } from "jimu-core";
import { FeatureHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { EContextMenuKeys } from "widgets/shared-code/enums";

const JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(["geoprocessor"]);

/** - Vygenerování protokolu. */
export default async function(params: IParams) {
    if (!JSAPIModuleLoader.isLoaded) {
        await JSAPIModuleLoader.load();
    }

    let Layout_Template: string;
    if (Array.isArray(params.reportOptions) && !!params.reportOptionField) {
        Layout_Template = params.reportOptions.find(reportOption => reportOption.value === params.feature.getAttribute(params.reportOptionField))?.reportName;
    }

    const reportParams: IReportTaskParams = {
        Web_Map_as_JSON: { expression: `${params.table.objectIdField}=${params.feature.getObjectId()}` },
        Layout_Template 
    };

    const jobInfo = await JSAPIModuleLoader.getModule("geoprocessor").submitJob(params.reportServiceUrl, reportParams);

    const results = await jobInfo.waitForJobCompletion();

    if (results.jobStatus === "job-succeeded") {
        const result = await jobInfo.fetchResultData("Output_File");

        if (typeof result.value?.['url'] !== "string") {
            throw new Error(`Could not read report file URL from ${JSON.stringify(result.toJSON())}`)
        }

        //#region - Stáhnutí protokolu
        const [fileBlob, fileName] = await Promise.all([
            (await fetch(result.value?.['url'])).blob(),
            getFileName({ feature: params.feature, fileNameTemplate: params.fileNameTemplate, intl: params.intl, table: params.table })
        ]);

        let url = window.URL.createObjectURL(fileBlob);
        let link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.pdf`;
        link.click();
        //#endregion
    } else {
        throw new Error(`Generating report failed with job status: '${results.jobStatus}'`);
    }
}

/** - Vygenerování názvu souboru podle {@link IParams.fileNameTemplate šablony}. */
async function getFileName(params: Pick<IParams, "feature" | "intl" | "fileNameTemplate" | "table">): Promise<string> {
    let fileName = params.fileNameTemplate;
    if (typeof params.fileNameTemplate === "string") {
        const matchRes = params.fileNameTemplate.matchAll(new RegExp(/{([^}]+)}/, "g"));
        const fieldsForFileName: Array<__esri.Field> = [];
        for (let matchPart = matchRes.next(); !matchPart.done; matchPart = matchRes.next()) {
            if (typeof matchPart.value[1] === "string") {
                const field = params.table.fields.find(field => FeatureHelper.compareFieldName(field, matchPart.value[1]));
                if (!!field) {
                    fieldsForFileName.push(field);
                }
            }
        }

        if (fieldsForFileName.length > 0) {
            for (let field of fieldsForFileName) {
                fileName = fileName.replace(`{${field.name}}`, FeatureHelper.getFeatureValue(params.feature, field, { intl: params.intl }) as string);
            }
        }

    }

    return fileName;
}

interface IParams extends Pick<HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.GenerateProtocol>, "reportServiceUrl" | "fileNameTemplate">, Pick<HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.GenerateProtocol>['fields'][number], "reportOptions"> {
    /** - Prvek protokolu. */
    feature: __esri.Graphic;
    /** - Zdrojová tabulka {@link feature prvku reportu}. */
    table: __esri.FeatureLayer;
    intl: IntlShape;
    /** - Název atributu podle jehož hodnoty se z {@link reportOptions} určuje jaký protokol se vygeneruje. */
    reportOptionField?: string;
}

interface IReportTaskParams {
    Web_Map_as_JSON: {
        expression: string;
    };
    Layout_Template: string;
}