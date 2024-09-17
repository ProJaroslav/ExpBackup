import { React, ReactRedux, IMState } from "jimu-core";
import { DbRegistryLoader, ArcGISJSAPIModuleLoader, NotificationHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { EConstants, EDbRegistryKeys } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import IMConfig from "../../IConfig";
import translations from "../translations/default";
import { DataValidatorContext, IDataValidatorMethods } from "../contexts/DataValidatorContext";
import { IDataValidatorMethods as IDataValidatorRefMethods } from "../components/DataValidator";

const DataValidator = React.lazy(() => import("../components/DataValidator"));

export default function(props: React.PropsWithChildren<{}>) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const config = useConfig<IMConfig>();
    const messageFormater = useMessageFormater(translations);
    /** - Uživatelské jméno přihlášeného uživatele. */
    const currentUserName = ReactRedux.useSelector<IMState, string>(state => state.user?.username);
    /** - Prvky podle kterých se ověřují práva uživatele na potvrzení platnosti dat. */
    const [layerRightsFeatures, setLayerRightsFeatures] = React.useState<Array<IMapImageDefinitionFeaturesPair>>([]);
    const ArcGISJSAPIModule = React.useMemo(() => new ArcGISJSAPIModuleLoader(['Graphic']), []);
    const dataValidatorRef = React.useRef<IDataValidatorRefMethods>();

    /** - Načtení prvků {@link layerRightsFeatures} podle kterých se ověřují práva uživatele na potvrzení platnosti dat. */
    React.useEffect(() => {
        if (jimuMapView && currentUserName) {
            
            const abortController = new AbortController();

            (async function() {
                try {
                    const setting = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.TableOfContents, scope: "g", type: "json" }, abortController.signal);
                    
                    const dataValidity = !!config?.[EConstants.tocSettingKey] ? setting?.[config[EConstants.tocSettingKey]]?.dataValidity : null;
                    if (Array.isArray(dataValidity?.layerRightsTables) && !abortController.signal.aborted) {

                        const layerRightsFeatures = await Promise.all<IMapImageDefinitionFeaturesPair>(dataValidity.layerRightsTables.map(async (tableDefinition): Promise<IMapImageDefinitionFeaturesPair> => {
                            let layerRightsTable = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, tableDefinition, abortController.signal);

                            if (!layerRightsTable) {
                                return null;
                            }

                            if (!tableDefinition.userAttribute || !tableDefinition.layerIdAttribute || !tableDefinition.veraficationDateAttribute) {
                                throw new Error("One of attribute names is not defined: 'userAttribute', 'layerIdAttribute', 'veraficationDateAttribute'");
                            }

                            let featureSet = await layerRightsTable.queryFeatures({
                                where: `LOWER(${tableDefinition.userAttribute.trim()})='${currentUserName.toLocaleLowerCase()}'`,
                                outFields: [layerRightsTable.objectIdField, tableDefinition.layerIdAttribute.trim(), tableDefinition.veraficationDateAttribute.trim()]
                            }, { signal: abortController.signal });

                            return { featureSet, tableDefinition };
                        }));
    
                        if (!abortController.signal.aborted) {
                            setLayerRightsFeatures(
                                layerRightsFeatures.filter(layerRightsFeature => layerRightsFeature?.featureSet?.features?.length > 0)
                            );
                        }
                    }
                    
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        NotificationHelper.addNotification({ message: messageFormater("failedToLoadDataValidationFeatures"), type: "warning" });
                    }
                }
            })();

            return function() {
                abortController.abort();
                setLayerRightsFeatures([]);
            };
        }
    }, [jimuMapView, config?.[EConstants.tocSettingKey], currentUserName]);

    const dataValidatorMethods = React.useMemo<IDataValidatorMethods>(() => ({
        canValidate(sublayer) {
            try {
                const sublayerDefinition = LayerDefinitionHelper.getSublayerDefinitonSync(sublayer);

                for (let layerRightsFeatureSet of layerRightsFeatures) {
                    if (!LayerDefinitionHelper.matchMapImageLayerDefinition(layerRightsFeatureSet.tableDefinition, sublayerDefinition)) {
                        continue;
                    }

                    let featureIndex = layerRightsFeatureSet.featureSet.features.findIndex(fetaure => parseInt(fetaure.getAttribute(layerRightsFeatureSet.tableDefinition.layerIdAttribute.trim())) === sublayer.id);

                    if (featureIndex !== -1) {
                        return true;
                    }
                }
                return false;
            } catch(err) {
                console.warn(err);
                return false;
            }
        },
        async validate(sublayer) {
            try {
                const setting = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.TableOfContents, scope: "g", type: "json" });

                let layerVerificationTablesDefinitions = setting[config[EConstants.tocSettingKey]].dataValidity.layerVerificationTables;

                if (!Array.isArray(layerVerificationTablesDefinitions) || layerVerificationTablesDefinitions.length < 1) {
                    dataValidatorRef.current.close();
                    return NotificationHelper.addNotification({
                        message: messageFormater("layerVerificationTablesNotDefined"),
                        type: "warning"
                    });
                }

                const layerVerificationTables = (await Promise.all(layerVerificationTablesDefinitions.map(async layerVerificationTablesDefinition => {
                    return {
                        table: await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, layerVerificationTablesDefinition),
                        definition: layerVerificationTablesDefinition
                    }
                }))).filter(({ table }) => !!table);

                dataValidatorRef.current.startValidation(layerVerificationTables, sublayer);

            } catch(err) {
                dataValidatorRef.current.close();
                console.warn(err);
                NotificationHelper.addNotification({
                    message: messageFormater("failedToValidateData").replace("{0}", sublayer?.title).replace("{1}", (err as Error)?.message),
                    type: "warning"
                });
            }
        }
    }), [layerRightsFeatures, config?.[EConstants.tocSettingKey], jimuMapView, messageFormater, ArcGISJSAPIModule]);

    if (!Array.isArray(layerRightsFeatures) || layerRightsFeatures.length < 1) {
        return <>{props.children}</>;
    }

    return <React.Suspense fallback={props.children}>
        <DataValidatorContext.Provider value={dataValidatorMethods}>
            {props.children}
        </DataValidatorContext.Provider>
        <DataValidator
            ref={dataValidatorRef}
            layerRightsFeatures={layerRightsFeatures}
        />
    </React.Suspense>;
}

interface IMapImageDefinitionFeaturesPair {
    /** - Prvky podle kterých se ověřují práva uživatele na potvrzení platnosti dat. */
    featureSet: __esri.FeatureSet;
    /** - Definice vrstvy 'Správci vrstev' ze které {@link featureSet prvky} pocházejí. */
    tableDefinition: HSI.DbRegistry.ITableOfContentsDbValue[string]['dataValidity']['layerRightsTables'][number];
}