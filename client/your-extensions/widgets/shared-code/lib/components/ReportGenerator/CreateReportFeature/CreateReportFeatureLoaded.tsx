import { React, useIntl } from "jimu-core";
import { ModalBody, ModalFooter, Button } from "jimu-ui";
import CreateReportFeatureBody from "./CreateReportFeatureBody";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, DbRegistryLoader, LayerHelper, ReportHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, ELoadStatus } from "widgets/shared-code/enums";

/** - Konponenta pro vygenerování protokolu. */
export default function(props: HSI.ReportComponent.ICreateReportFeatureLoadedProps) {
    props.feature
    const messageFormater = useMessageFormater(props.translations);
    const [state, setState] = React.useState<HSI.ReportComponent.ICreateReportFeatureBodyProps['state']>(null);
    const intl = useIntl();

    /** - Přenačtení relací pro {@link props.originFeature prvek}. */
    async function updateRelation() {
        try {
            const [relationshipQueries, originLayerDefinition, protocolLayerDefinition] = await Promise.all([
                DbRegistryLoader.fetchDbRegistryValue(props.jimuMapView, { name: EDbRegistryKeys.RelationshipQueries, scope: "g", type: "json" }),
                LayerDefinitionHelper.getLayerDefinitionFromFeature(props.jimuMapView, props.originFeature),
                LayerDefinitionHelper.getLayerDefinitionFromFeature(props.jimuMapView, props.feature)
            ]);

            if (Array.isArray(relationshipQueries?.attributeRelationships)) {
                const relationshipClassId = relationshipQueries.attributeRelationships.find(attributeRelationship => {
                    return (LayerDefinitionHelper.matchDefinition(attributeRelationship.originLayer, originLayerDefinition) && LayerDefinitionHelper.matchDefinition(attributeRelationship.destinationLayer, protocolLayerDefinition) || (LayerDefinitionHelper.matchDefinition(attributeRelationship.originLayer, protocolLayerDefinition) && LayerDefinitionHelper.matchDefinition(attributeRelationship.destinationLayer, originLayerDefinition)));
                })?.id;

                if (!!relationshipClassId) {
                    props.onFeatureCreated(props.originFeature, relationshipClassId);
                }
            }

        } catch(err) {
            console.warn(err);
        }
    }

    /** - Vygenerování protokolu. */
    async function generate() {
        try {
            //#region - Validace povinných parametrů
            for (let field of props.fields) {
                let value = props.feature.getAttribute(field.field.name)
                if (!field.field.nullable && !value && value !== 0) {
                    NotificationHelper.addNotification({ message: messageFormater("reportRequiredAttributeMissing").replace("{0}", field.field.alias), type: "warning" });
                    return;
                }
            }
            //#endregion

            setState({ reportStatus: ELoadStatus.Pending });

            /** - Zdrojová vrstva {@link props.feature prvku}. */
            const table = LayerHelper.getSourceLayerFromFeature(props.feature) as __esri.FeatureLayer;

            if (table?.type !== "feature") {
                throw new Error(`Unsupported table type ${table?.type}`);
            }

            const response = await LayerHelper.applyFeatureLayerEdits(table, { addFeatures: [props.feature] });

            if (!!response.addFeatureResults[0].error) {
                throw new Error(JSON.stringify(response.addFeatureResults[0].error));
            }

            updateRelation();

            const featureSet = await table.queryFeatures({ outFields: ["*"], objectIds: [response.addFeatureResults[0].objectId], returnGeometry: false });

            /** - Pole, podle kterého se určuje jaký protokol se vygeneruje. */
            const layoutField = props.fields.find(f => Array.isArray(f.reportOptions));

            await ReportHelper.generateFeatureReport({
                feature: featureSet.features[0],
                fileNameTemplate: props.fileNameTemplate,
                intl,
                reportServiceUrl: props.reportServiceUrl,
                table,
                reportOptions: layoutField?.reportOptions,
                reportOptionField: layoutField?.field.name
            });

            NotificationHelper.addNotification({ message: messageFormater("reportSuccessMessage"), type: "success" });
            props.closeModal();

        } catch(error) {
            console.warn(error);
            setState({
                error,
                reportStatus: ELoadStatus.Error
            });
        }
    }

    function setDefaultState() {
        setState(null);
    }

    return <>
        <ModalBody>
            <CreateReportFeatureBody
                feature={props.feature}
                fields={props.fields}
                translations={props.translations}
                useTextInputs={props.useTextInputs}
                state={state}
            />
        </ModalBody>
        <ModalFooter>
            <Button
                onClick={state?.reportStatus === ELoadStatus.Error ? setDefaultState : generate}
                type="primary"
                disabled={state?.reportStatus === ELoadStatus.Pending}
            >
                {state?.reportStatus === ELoadStatus.Error ? messageFormater("tryAgainReportButton") : messageFormater("saveReportButton")}
            </Button>
            <Button
                onClick={props.closeModal}
                type="danger"
                disabled={state?.reportStatus === ELoadStatus.Pending}
            >
                {messageFormater("closeReportButton")}
            </Button>
        </ModalFooter>
    </>;
}