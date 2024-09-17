import { React } from "jimu-core";
import { Tabs, Tab } from "jimu-ui"
import translations from "../translations/default";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { Suspense } from "widgets/shared-code/components";
import { DbRegistryLoader, LayerHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

const AttributeTable = React.lazy(() => import("./AttributeTable"));
const Documents = React.lazy(() => import("./Documents"));
const History = React.lazy(() => import("./History"));
const Geometry = React.lazy(() => import("./Geometry"));
const MassAttributeTable = React.lazy(() => import("./MassAttributeTable/MassAttributeTable"));

/** - Spodní část widgetu. */
export default function(props: IBottomPaneProps) {
    const messageFormater = useMessageFormater(translations);
    const configuration = useConfiguration();
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();
    /** - Je povolena archivace u zvolené vrstvy/prvku? */
    const [archivingEnabled, setArchivingEnabled] = React.useState<boolean>(false);
    /** - Dodatečné informace, které se zobrazí v titulku záložky dokumentů. */
    const [additionalDocumentInfo, setAdditionalDocumentInfo] = React.useState<string>("");
    const jimuMapView = React.useContext(JimuMapViewContext);
    
    //#region - Při změně vybraného prvku se vymažou dodatečné informace, které se zobrazí v titulku záložky dokumentů.
    React.useEffect(() => {
        return function() {
            setAdditionalDocumentInfo("");
        };
    }, [props.selectedFeatures]);
    //#endregion

    //#region - Zjištění zda je povolena archivace u zvolené vrstvy/prvku.
    React.useEffect(() => {
        let isActive = true;

        (async function () {
            try {

                let layer: __esri.Sublayer | __esri.FeatureLayer;
                switch(props.selectedFeatures.type) {
                    case ESelectedFeaturesType.Feature:
                    case ESelectedFeaturesType.Layer:
                    case ESelectedFeaturesType.RelationFeature:
                        layer = LayerHelper.getSublayerFromFeature(props.selectedFeatures.features[0]);
                        break;
                    case ESelectedFeaturesType.TableFeature:
                    case ESelectedFeaturesType.Table:
                    case ESelectedFeaturesType.RelationTableFeature:
                        layer = LayerHelper.getTableFromFeature(props.selectedFeatures.features[0]);
                        break;
                }
        
                if (layer) {
                    const archiving = await LayerHelper.supportsArchiving(layer)
                    if (isActive) {
                        setArchivingEnabled(archiving);
                    }
                }
            } catch(err) {
                console.warn(err);
            }
        })();

        return function() {
            setArchivingEnabled(false);
            isActive = false;
        }
    }, [props.selectedFeatures])
    //#endregion

    /** - Konfigurace editovatelnosti pro vrstvu ze které pochází označený prvek. */
    const sublayerConfiguration = React.useMemo((): HSI.DbRegistry.ISublayerEditabilityConfiguration | HSI.DbRegistry.ITableEditabilityConfiguration => {
        let defaultValue: HSI.DbRegistry.ISublayerEditabilityConfiguration | HSI.DbRegistry.ITableEditabilityConfiguration = {
            sublayerId: null,
            allowGeometryUpdate: false,
            allowUpdate: false,
            allowAddAttachment: false,
            allowDefineMainAttachment: false,
            allowDeleteAttachment: false,
            displayAttachments: configuration?.editabilityConfiguration?.displayAttachmentsByDefault,
            allowDelete: false,
            allowMassUpdate: false,
            allowAttributeRules: false,
            attributeRulesAttributes: configuration?.editabilityConfiguration?.attributeRulesAttributes,
            allowMassDelete: false
        };

        try {
            if (
                props.selectedFeatures.type === ESelectedFeaturesType.Feature ||
                props.selectedFeatures.type === ESelectedFeaturesType.RelationFeature ||
                props.selectedFeatures.type === ESelectedFeaturesType.Layer
            ) {
                const sublayer = LayerHelper.getSublayerFromFeature(props.selectedFeatures.features[0]);
                defaultValue.sublayerId = sublayer?.id;
                
                
                const value = configuration.editabilityConfiguration?.layerInfos
                    ?.find(layerInfo => {
                        return LayerDefinitionHelper.matchMapImageLayerDefinition({ mapServiceName: layerInfo.serviceLayer, mapName: layerInfo.mapName }, LayerDefinitionHelper.getSublayerDefinitonSync(sublayer));
                    })?.sublayerInfos
                    ?.find(sublayerInfo => {
                        return sublayerInfo.sublayerId === sublayer.id
                    });

                if (!!value && typeof value.displayAttachments !== "boolean") {
                    value.displayAttachments = configuration.editabilityConfiguration.displayAttachmentsByDefault;
                }

                if (!!value && !Array.isArray(value.attributeRulesAttributes)) {
                    value.attributeRulesAttributes = configuration.editabilityConfiguration.attributeRulesAttributes;
                }

                return value || defaultValue;
            } else if(
                props.selectedFeatures.type === ESelectedFeaturesType.RelationTableFeature ||
                props.selectedFeatures.type === ESelectedFeaturesType.TableFeature ||
                props.selectedFeatures.type === ESelectedFeaturesType.Table
            ) {
                const table = LayerHelper.getTableFromFeature(props.selectedFeatures.features[0]);
                defaultValue = {
                    tableId: table?.layerId,
                    allowUpdate: false,
                    allowAddAttachment: false,
                    allowDefineMainAttachment: false,
                    allowDeleteAttachment: false,
                    displayAttachments: configuration?.editabilityConfiguration?.displayAttachmentsByDefault,
                    allowDelete: false,
                    allowMassUpdate:  false,
                    allowAttributeRules: false,
                    attributeRulesAttributes: configuration?.editabilityConfiguration?.attributeRulesAttributes,
                    allowMassDelete: false
                };

                const value = configuration.editabilityConfiguration?.layerInfos
                    ?.find(layerInfo => {
                        return LayerDefinitionHelper.matchMapImageLayerDefinition({ mapServiceName: layerInfo.serviceLayer, mapName: layerInfo.mapName }, LayerDefinitionHelper.getTableDefinitonSync(jimuMapView, table));
                    })?.tableInfos
                    ?.find(tableInfos => {
                        return tableInfos.tableId === table.layerId
                    });

                if (!!value) {
                    if (typeof value.displayAttachments !== "boolean") {
                        value.displayAttachments = configuration.editabilityConfiguration.displayAttachmentsByDefault;
                    }
    
                    if (!Array.isArray(value.attributeRulesAttributes)) {
                        value.attributeRulesAttributes = configuration.editabilityConfiguration.attributeRulesAttributes;
                    }

                    if ("allowGeometryUpdate" in value) {
                        delete value['allowGeometryUpdate'];
                    }
                }

                return value || defaultValue;
            }
        } catch(err) {
            console.warn(err);
            return defaultValue;
        }
        return defaultValue;
            
    }, [configuration.editabilityConfiguration, props.selectedFeatures, jimuMapView]);

    return <LayerConfigurationContext.Provider value={sublayerConfiguration}>
        {
            function() {
                //#region - Obsah pro vybraný samostatný prvek
                if (props.selectedFeatures.type === ESelectedFeaturesType.Feature || props.selectedFeatures.type === ESelectedFeaturesType.RelationFeature || props.selectedFeatures.type === ESelectedFeaturesType.TableFeature || props.selectedFeatures.type === ESelectedFeaturesType.RelationTableFeature) {
                    return <Tabs
                        className="bottom-pane-tabs"
                        type="tabs"
                        defaultValue="attributes"
                        fill
                        keepMount={false}
                    >
                        <Tab id="attributes" title={messageFormater("attributesTab")}>
                            <Suspense>
                                <AttributeTable
                                    feature={props.selectedFeatures.features[0]}
                                    geometryColor={configuration.editabilityConfiguration?.geometryColor}
                                    pointSize={configuration.editabilityConfiguration?.pointSize}
                                    tableFeature={props.selectedFeatures.type === ESelectedFeaturesType.TableFeature || props.selectedFeatures.type === ESelectedFeaturesType.RelationTableFeature}
                                />
                            </Suspense>
                        </Tab>
                        {
                            sublayerConfiguration.displayAttachments && !config.forbidDocumentsTab ? (
                                <Tab id="documents" title={messageFormater("documentsTab") + additionalDocumentInfo}>
                                    <Suspense>
                                        <Documents
                                            feature={props.selectedFeatures.features[0]}
                                            attachmentsSetting={configuration.attachmentConfiguration}
                                            setAdditionalDocumentInfo={setAdditionalDocumentInfo}
                                            tableFeature={props.selectedFeatures.type === ESelectedFeaturesType.TableFeature || props.selectedFeatures.type === ESelectedFeaturesType.RelationTableFeature}
                                        />
                                    </Suspense>
                                </Tab>
                            ) : null
                        }
                        {
                            props.selectedFeatures.type !== ESelectedFeaturesType.TableFeature && props.selectedFeatures.type !== ESelectedFeaturesType.RelationTableFeature && config.displayGeometryTab ? <Tab id="geometry" title={messageFormater("geometryTab")}>
                                <Suspense>
                                    <Geometry
                                        feature={props.selectedFeatures.features[0]}
                                        geometryColor={configuration.editabilityConfiguration?.geometryColor}
                                        pointSize={configuration.editabilityConfiguration?.pointSize}
                                    />
                                </Suspense>
                            </Tab> : null
                        }
                        {
                            archivingEnabled && !config.forbidHistoryTab ? (
                                <Tab id="history" title={messageFormater("historyTab")}>
                                    <Suspense>
                                        <History feature={props.selectedFeatures.features[0]} />
                                    </Suspense>
                                </Tab>
                            ) : null
                        }
                    </Tabs>;
                }
                //#endregion
                
                //#region - Obsah pro vybranou vrstvu
                if (props.selectedFeatures.type === ESelectedFeaturesType.Layer || props.selectedFeatures.type === ESelectedFeaturesType.Table) {
                    return <Tabs
                        className="bottom-pane-tabs"
                        type="tabs"
                        defaultValue="attributes"
                        fill
                        keepMount={false}
                    >
                        {[<Tab id="attributes" title={messageFormater("attributesTab")}>
                            <Suspense>
                                <MassAttributeTable
                                    features={props.selectedFeatures.features}
                                    tableFeature={props.selectedFeatures.type === ESelectedFeaturesType.Table}
                                />
                            </Suspense>
                        </Tab>]}
                    </Tabs>;
                }
                //#endregion
                
                return <></>;
            }()
        }
    </LayerConfigurationContext.Provider>;
}

export interface IBottomPaneProps {
    /** - Označené prvky ve stromové struktuře. */
    selectedFeatures: HSI.SelectionResultWidget.ISelectedFeatures;
}

/** - Poskytuje konfiguraci widgetu. */
function useConfiguration(): IConfiguration {
    const [editabilityConfiguration, setEditabilityConfiguration] = React.useState<HSI.DbRegistry.IEditabilityDbValue>();
    const [attachmentConfiguration, setAttachmentConfiguration] = React.useState<HSI.DbRegistry.IAttachmentsDbValue>();
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();
    const jimuMapView = React.useContext(JimuMapViewContext);

    React.useEffect(() => {
        const abortController = new AbortController();

        Promise.all([
            DbRegistryLoader.fetchEditabilityDbRegistryValue(jimuMapView, { nameExtension: config.dbRegistryConfigKey }),
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", scope: "g", name: EDbRegistryKeys.Attachments })
        ])
            .then(([ec, ac]) => {
                setEditabilityConfiguration(ec);
                setAttachmentConfiguration(ac);
            })
            .catch(err => {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                }
            })

        return function() {
            setEditabilityConfiguration(undefined);
            abortController.abort();
        }
    }, [jimuMapView, config.dbRegistryConfigKey]);

    return { editabilityConfiguration, attachmentConfiguration };
}

interface IConfiguration {
    /** - Konfigurace editovatelnosti podvrstev a atributů. */
    editabilityConfiguration: HSI.DbRegistry.IEditabilityDbValue;
    /** - Konfigurace vrstev, které mají hlavní soubor zobrazujicí se v pop-upu. */
    attachmentConfiguration: HSI.DbRegistry.IAttachmentsDbValue;
}