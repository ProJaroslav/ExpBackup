import { IMState, React, ReactRedux } from "jimu-core";
import { ModalBody, LoadingType, Loading, Button, ModalFooter } from "jimu-ui";
import WarningContent from "../../WarningContent";
import CreateReportFeatureLoaded from "./CreateReportFeatureLoaded";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { FeatureHelper, LayerHelper, LayerDefinitionHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";

const defaultState: ICreateReportFeatureLoaderState = {
    feature: null,
    fields: [],
    loadingState: ELoadStatus.Pending,
    fileNameTemplate: null,
    reportServiceUrl: null
};

const JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(["Graphic"]);

/** - Komponenta načítá data pro generování protokolu a vykresluje komponentu na samotné generování . */
export default function(props: HSI.ReportComponent.ICreateReportFeatureLoaderProps) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const [state, setState] = React.useState<ICreateReportFeatureLoaderState>(defaultState);
    const messageFormater = useMessageFormater(props.translations);
    /** - Uživatelské jméno přihlášeného uživatele. */
    const currentUserName = ReactRedux.useSelector<IMState, string>(state => {
        let username = state.user?.username;
        if (typeof username === "string") {
            username = username.split("@")[0];
            return username.trim();
        }
    });

    React.useEffect(() => {
        if (!!jimuMapView && !!props.feature) {
            const abortController = new AbortController();

            (async function() {
                try {
                    setState(defaultState);
                    
                    if (!Array.isArray(props.fields) || props.fields.length < 1) {
                        const layerDefinition = await LayerDefinitionHelper.getLayerDefinitionFromFeature(jimuMapView, props.feature);
                        throw new Error(messageFormater("reportFieldsMissingMessage").replace("{0}", JSON.stringify(layerDefinition)));
                    }

                    if (!JSAPIModuleLoader.isLoaded) {
                        await JSAPIModuleLoader.load();
                    }


                    /** - Negrafická vstva, ve které se pro tento {@link props.feature prvek} vytváří protokol. */
                    const table = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, props.reportTable, abortController.signal) as __esri.FeatureLayer;

                    if (!table) {
                        throw new Error(messageFormater("reportTableMissingMessage").replace("{0}", JSON.stringify(props.reportTable)));
                    }

                    if (!table.loaded) {
                        await table.load();
                    }

                    /** - Pole z FeatureServer {@link table této tabulky}. */
                    const tableFileds = LayerHelper.isServerLayer(table, "MapServer") ? (await LayerHelper.duplicateTable(jimuMapView, table, true)).fields : table.fields;

                    /** - Nový prvek reportu. */
                    const feature = new (JSAPIModuleLoader.getModule("Graphic"))();
                    FeatureHelper.setSourceLayer(feature, table);
                  
                    /** - Pole zobrazující se v tabulce pro vytvoření reportu. */
                    const fields = await Promise.all<ICreateReportFeatureLoaderState['fields'][number]>(props.fields.map(async fieldSettig => {
                        const field = tableFileds.find(field => FeatureHelper.compareFieldName(field, fieldSettig.fieldName));
                        if (!field) {
                            throw new Error(messageFormater("reportFieldMissingMessage").replace("{0}", table.title).replace("{1}", fieldSettig.fieldName));
                        }
    
                        if (!!fieldSettig.relateAttribute) {
                            feature.setAttribute(field.name, props.feature.getAttribute(fieldSettig.relateAttribute));
                        }
    
                        if (field.nullable && fieldSettig.required) {
                            field.nullable = false;
                        }
    
                        
                        if (fieldSettig.currentUser) {
                            if (!currentUserName) {
                                if (!fieldSettig.editable && !field.nullable) {
                                    throw new Error(messageFormater("reportUserNameMissingMessage"));
                                } else {
                                    return {
                                        field,
                                        editable: fieldSettig.editable,
                                        reportOptions: fieldSettig.reportOptions
                                    };
                                }
                            }
                            if (!fieldSettig.loginTableDefinition) {
                                throw new Error(messageFormater("reportUserTableMissingMessage").replace("{0}", fieldSettig.fieldName));
                            }
                            let loginTable = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, fieldSettig.loginTableDefinition, abortController.signal);
    
                            if (!loginTable) {
                                throw new Error(messageFormater("reportUserTableNotFoundMessage").replace("{0}", JSON.stringify(fieldSettig.loginTableDefinition)));
                            }
    
                            if (!fieldSettig.loginTableDefinition.userNameAttribute) {
                                throw new Error(messageFormater("reportUserAttributeMissingMessage"));
                            }
                            if (!fieldSettig.loginTableDefinition.userIdAttribute) {
                                throw new Error(messageFormater("reportUserIdAttributeMissingMessage"));
                            }
    
                            let featureSet = await loginTable.queryFeatures({
                                where: `LOWER(${fieldSettig.loginTableDefinition.userNameAttribute}) LIKE '${currentUserName}'`,
                                outFields: [fieldSettig.loginTableDefinition.userIdAttribute],
                                returnGeometry: false
                            }, { signal: abortController.signal });

                            if (!featureSet.features[0]) {
                                if (!fieldSettig.editable && !field.nullable) {
                                    throw new Error(messageFormater("reportFailedToFindUser").replace("{0}", currentUserName).replace("{1}", JSON.stringify(fieldSettig.loginTableDefinition)));
                                }
                            } else {
                                feature.setAttribute(field.name, featureSet.features[0].getAttribute(fieldSettig.loginTableDefinition.userIdAttribute));
                            }
                        }
    
                        return {
                            field,
                            reportOptions: fieldSettig.reportOptions,
                            editable: fieldSettig.editable
                        };
                    }));

                    //#region - Přidání povinných polí - bez nich by protokol nešel vytvořit.
                    for (let field of tableFileds) {
                        if (!field.nullable && !fields.some(f => f.field === field) && field.type !== "blob" && field.type !== "oid" && field.type !== "global-id" && field.type !== "geometry" && field.type !== "guid" && field.type !== "raster" && field.type !== "xml") {
                            fields.push({
                                field,
                                editable: true
                            });
                        }
                    }
                    //#endregion

                    if (!abortController.signal.aborted) {
                        setState({
                            fields,
                            feature,
                            loadingState: ELoadStatus.Loaded,
                            fileNameTemplate: props.fileNameTemplate,
                            reportServiceUrl: props.reportServiceUrl
                        });
                    }
                } catch(error) {
                    if (!abortController.signal.aborted) {
                        console.warn(error);
                        setState({
                            feature: null,
                            fields: [],
                            loadingState: ELoadStatus.Error,
                            error,
                            fileNameTemplate: null,
                            reportServiceUrl: null
                        })
                    }
                }
            })();
            
            return function() {
                abortController.abort();
                setState(defaultState);
            }
        }
    }, [jimuMapView, props.feature, currentUserName]);
    
    switch(state.loadingState) {
        case ELoadStatus.Error:
            return <>
                <ModalBody>
                    <WarningContent title={messageFormater("failedToLoadReport")} message={state.error?.message} />
                </ModalBody>
                <ModalFooter>
                    <Button
                        onClick={props.closeModal}
                        type="danger"
                    >
                        {messageFormater("closeReportButton")}
                    </Button>
                </ModalFooter>
            </>;

        case ELoadStatus.Pending:
            return <ModalBody style={{ height: 200 }} ><Loading type={LoadingType.Primary} /></ModalBody>;

        case ELoadStatus.Loaded:
            return <CreateReportFeatureLoaded
                originFeature={props.feature}
                fields={state.fields}
                feature={state.feature}
                closeModal={props.closeModal}
                fileNameTemplate={state.fileNameTemplate}
                reportServiceUrl={state.reportServiceUrl}
                jimuMapView={props.jimuMapView}
                translations={props.translations}
                useTextInputs={props.useTextInputs}
                onFeatureCreated={props.onFeatureCreated}
            />;

        default:
            console.warn(`Unhandled loading state ${state.loadingState}`);
            return <></>;
    }
}

interface ICreateReportFeatureLoaderState extends Omit<HSI.ReportComponent.ICreateReportFeatureLoadedProps, "closeModal" | "originFeature" | "translations" | "jimuMapView" | "useTextInputs" | "onFeatureCreated"> {
    /** - Chyba ke které došlo při načítání state. */
    error?: Error;
    /** - Stav načtení state. */
    loadingState: ELoadStatus;
}