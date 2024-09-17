import { ArcGISJSAPIModuleLoader, FeatureHelper } from "widgets/shared-code/helpers";

export default class ReportHelper {
    private static _moduleLoader: ArcGISJSAPIModuleLoader<["geoprocessor"]>;

    private static get moduleLoader() {
        if (!ReportHelper._moduleLoader) {
            ReportHelper._moduleLoader = new ArcGISJSAPIModuleLoader(["geoprocessor"]);
        }
        return ReportHelper._moduleLoader;
    };
    /**
     * - Vygenerování reportu.
     * - Vyvolá se stažení PDF souboru s reportem.
     * @param params - Parametry reportu.
     */
    public static async generateReport(params: HSI.ReportComponent.IGenerateReportParams) {
        if (!ReportHelper.moduleLoader.isLoaded) {
            await ReportHelper.moduleLoader.load();
        }

        const jobInfo = await ReportHelper.moduleLoader.getModule("geoprocessor").submitJob(params.reportServiceUrl, params.reportBody);

        const results = await jobInfo.waitForJobCompletion();

        if (results.jobStatus === "job-succeeded") {
            const result = await jobInfo.fetchResultData("Output_File");

            if (typeof result.value?.['url'] !== "string") {
                throw new Error(`Could not read report file URL from ${JSON.stringify(result.toJSON())}`)
            }

            //#region - Stáhnutí protokolu
            const fileBlob = await (await fetch(result.value?.['url'])).blob();

            let url = window.URL.createObjectURL(fileBlob);
            let link = document.createElement("a");
            link.href = url;
            link.download = `${params.fileName}.pdf`;
            link.click();
            //#endregion
        } else {
            throw new Error(`Generating report failed with job status: '${results.jobStatus}'`);
        }
    }

    /**
     * - Vygenerování protokolu z jednoho prvku.
     * - Vyvolá se stažení PDF souboru s reportem.
     * @param params - Parametry reportu.
     */
    public static async generateFeatureReport(params: HSI.ReportComponent.IGenerateFeatureReportParams) {
        const fileName = await ReportHelper.getFileName({ feature: params.feature, fileNameTemplate: params.fileNameTemplate, intl: params.intl, table: params.table });

        let Layout_Template: string;
        if (Array.isArray(params.reportOptions) && !!params.reportOptionField) {
            Layout_Template = params.reportOptions.find(reportOption => reportOption.value === params.feature.getAttribute(params.reportOptionField))?.reportName;
        }

        return ReportHelper.generateReport({
            fileName,
            reportBody: {
                Web_Map_as_JSON: { expression: `${params.table.objectIdField}=${params.feature.getObjectId()}` },
                Layout_Template 
            },
            reportServiceUrl: params.reportServiceUrl
        });
    }

    /** - Vygenerování názvu souboru podle {@link IParams.fileNameTemplate šablony}. */
    private static async getFileName(params: Pick<HSI.ReportComponent.IGenerateFeatureReportParams, "feature" | "intl" | "fileNameTemplate" | "table">): Promise<string> {
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
}
