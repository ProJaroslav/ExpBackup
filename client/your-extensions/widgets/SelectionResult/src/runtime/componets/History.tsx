import { React, useIntl } from "jimu-core";
import { Card, CardBody } from "jimu-ui";
import useFieldOrder from "../hooks/useFieldOrder";
import translations from "../translations/default";
import { useMessageFormater, useConfig, useFieldAlias, useForceUpdate } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { Table } from "widgets/shared-code/components";
import { NotificationHelper, FeatureHelper, RequestHelper, LayerHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { EFieldAlias, EKnownLayerExtension, EFeatureType, ELoadStatus } from "widgets/shared-code/enums";

const ModuleLoader = new ArcGISJSAPIModuleLoader(["Graphic"]);

/** - Zobrazení historie změn prvku. */
export default function(props: IHistoryProps) {
    const messageFormater = useMessageFormater(translations);
    const [historyFeatures, setHistoryFeatures] = React.useState<Array<__esri.Graphic>>([]);
    const [loadindState, setLoadindState] = React.useState<ELoadStatus>();
    const jimuMapView = React.useContext(JimuMapViewContext);
    const fieldsState = useFieldOrder(props.feature, true);
    const intl = useIntl();
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();
    const forceUpdate = useForceUpdate();
    const getFieldAlias = useFieldAlias(props.feature, config.forbidtPopupFormat ? EFieldAlias.default : EFieldAlias.popup);

    /** - Načtení hodnot do state. */
    React.useEffect(() => {
        const abortController = new AbortController();
        setLoadindState(ELoadStatus.Pending);

        if (props.feature) {
            (async function () {
                try {
                    /** - Identifikátor podvrstvy {@link layer} unikátní v rámci mapové služby {@link mapImageLayer}. */
                    let layerId: number;
                    /** - Podvrstva/Tabulka, ze ketré pochází prvek {@link props.feature}. */
                    let layer: __esri.FeatureLayer | __esri.Sublayer;
                    /** - Mapová služba, ze ketré pochází {@link layer}. */
                    let mapImageLayer: __esri.MapImageLayer;

                    //#region - Naplnění vrstev.
                    const type = FeatureHelper.getFeatureType(props.feature);
                    switch(type) {
                        case EFeatureType.Sublayer:
                            layer = LayerHelper.getSublayerFromFeature(props.feature);
                            mapImageLayer = (layer as __esri.Sublayer).layer as __esri.MapImageLayer;
                            layerId = (layer as __esri.Sublayer).id;
                            break;
                        case EFeatureType.Table:
                            layer = LayerHelper.getTableFromFeature(props.feature);
                            mapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, layer as __esri.FeatureLayer);
                            layerId = (jimuMapView, layer as __esri.FeatureLayer).layerId;
                            break;
                        default:
                            console.warn(`Unhandled feature type '${type}'`)
                    }
                    //#endregion

                    const hasSoe = await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.HistorySoe);
                    if (!hasSoe) {
                        NotificationHelper.addNotification({ message: messageFormater("mapImageLayerHasNotRequiredSoe"), type: "warning" });
                        return;
                    }

                    const mapName = await LayerHelper.findMapName(mapImageLayer);

                    const body: IHistoryRequestBody = {
                        layerId,
                        mapName,
                        oid: props.feature.getObjectId()
                    };

                    const [response] = await Promise.all([
                        RequestHelper.jsonRequest<IHistoryResponse>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.HistorySoe)}/Archiving/GetFeatureHistory`, body, abortController.signal),
                        ModuleLoader.load()
                    ]);

                    setHistoryFeatures((response.features || []).map(feature => {
                        const newFeature = new (ModuleLoader.getModule("Graphic"))(feature);
                        FeatureHelper.setSourceLayer(newFeature, LayerHelper.getSourceLayerFromFeature(props.feature, true));
                        return newFeature;
                    }));
                    setLoadindState(ELoadStatus.Loaded);
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        NotificationHelper.addNotification({ message: messageFormater("loadEditHistoryFailed"), type: "error" });
                        setLoadindState(ELoadStatus.Error);
                    }
                }                
            })();
        }

        return function() {
            abortController.abort();
            setHistoryFeatures([]);
        }
    }, [props.feature, jimuMapView]);

    return <Card className="tab-card">
        <CardBody className="history-wrapper">
            <Table
                loading={loadindState === ELoadStatus.Pending || fieldsState.loadingState === ELoadStatus.Pending}
                header={fieldsState.fields.map(field => getFieldAlias(field?.field))}
                rows={historyFeatures.map(feature => fieldsState.fields.map(field => FeatureHelper.getFeatureValue(feature, field?.field, { intl, popupFormat: !config.forbidtPopupFormat, onLoad: forceUpdate })))}
            />
        </CardBody>
    </Card>;
}

interface IHistoryProps {
    /** - Prvek označený ve stromové struktuře. */
    feature: __esri.Graphic;
};

interface IHistoryResponse {
    layer: HSI.ISublayerDefinition | HSI.ITableDefinition;
    features: Array<{ attributes: any; geometry: any; }>;
    archivingInfo: {
        isArchivingEnabled: boolean;
        archivingInfo: {
            archiveTableName: string;
            datasetName: string;
            fromFieldName: string;
            oidFieldName: string;
            toFieldName: string;
        }
    }
};

interface IHistoryRequestBody {
    mapName: string;
    layerId: number;
    oid: number;
};