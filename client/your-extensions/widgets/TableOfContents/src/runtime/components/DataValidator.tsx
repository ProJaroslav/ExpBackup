import { React } from "jimu-core";
import { Modal, ModalBody, Button, ButtonGroup, ModalFooter, TextArea, Label, ModalHeader } from "jimu-ui";
import { LayerDefinitionHelper, ArcGISJSAPIModuleLoader, LayerHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";

export default React.memo(React.forwardRef<IDataValidatorMethods, IDataValidatorProps>(function (props, ref) {
    const [isModalOpened, toggleModalState] = React.useState<boolean>(false);
    const [sublayer, setSublayer] = React.useState<__esri.Sublayer>();
    const [layerVerificationTables, setLayerVerificationTables] = React.useState<Array<IlayerVerificationTable>>([]);
    const [note, setNote] = React.useState<string>("");
    const ArcGISJSAPIModule = React.useMemo(() => new ArcGISJSAPIModuleLoader(['Graphic']), []);
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = React.useContext(JimuMapViewContext);

    function close() {
        toggleModalState(false);
        setSublayer(undefined);
        setLayerVerificationTables([]);
    }

    async function performValidation() {
        let layerTitle: string;
        try {
            close();
            layerTitle = sublayer.title;
            const sublayerDefiniton = await LayerDefinitionHelper.getSublayerDefiniton(sublayer);
            const promises: Array<Promise<__esri.EditsResult>> = [];
            const newLayerVerificationFeatures: Array<__esri.Graphic> = [];
            const verifivationTime = Date.now();

            for (let featureSet of props.layerRightsFeatures) {
                if (!LayerDefinitionHelper.matchMapImageLayerDefinition(featureSet.tableDefinition, sublayerDefiniton)) {
                    continue;
                }

                let features = featureSet.featureSet.features.filter(fetaure => parseInt(fetaure.getAttribute(featureSet.tableDefinition.layerIdAttribute.trim())) === sublayer.id);

                if (features.length < 1) {
                    continue;
                }

                for (let fetaure of features) {
                    fetaure.setAttribute(featureSet.tableDefinition.veraficationDateAttribute.trim(), verifivationTime);
                    newLayerVerificationFeatures.push(fetaure);
                }

                let layerRightsTable = await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, featureSet.tableDefinition);

                
                promises.push(LayerHelper.applyFeatureLayerEdits(layerRightsTable, { updateFeatures: features }));
            }

            if (!ArcGISJSAPIModule.isLoaded) {
                await ArcGISJSAPIModule.load();
            }

            for (let layerVerificationTable of layerVerificationTables) {
                promises.push(
                    LayerHelper.applyFeatureLayerEdits(
                        layerVerificationTable.table,
                        {
                            addFeatures: newLayerVerificationFeatures.map(feature => {
                                return new (ArcGISJSAPIModule.getModule("Graphic"))({
                                    attributes: {
                                        [layerVerificationTable.definition.noteAttribute.trim()]: note,
                                        [layerVerificationTable.definition.layersRightsOidAttribute.trim()]: feature.getObjectId()
                                    }
                                });
                            })
                        }
                    )
                );
            }
            
            await Promise.all(promises);

            NotificationHelper.addNotification({
                message: messageFormater("dataValidationSuccess").replace("{0}", layerTitle),
                type: "success"
            });
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({
                message: messageFormater("failedToValidateData").replace("{0}", layerTitle).replace("{1}", (err as Error)?.message),
                type: "warning"
            });
        }
    }

    React.useImperativeHandle(ref, () => ({
        startValidation(layerVerificationTables, sublayer) {
            if (!Array.isArray(layerVerificationTables) || layerVerificationTables.length < 1) {
                close();
                return NotificationHelper.addNotification({
                    message: messageFormater("layerVerificationTablesNotFound"),
                    type: "warning"
                });
            }

            setSublayer(sublayer);
            toggleModalState(true)
            setLayerVerificationTables(layerVerificationTables);
        },
        close
    }));

    return <Modal
        isOpen={isModalOpened}
        toggle={close}
    >
        <ModalHeader
            toggle={close}
        >
            {messageFormater("dataValidationHeader")}
        </ModalHeader>
        <ModalBody>
            <Label className="w-100">
                {messageFormater("dataValidationNote")}
                <TextArea
                    placeholder={messageFormater("dataValidationNote")}
                    value={note}
                    onChange={ev => {
                        setNote(ev.target.value);
                    }}
                />
            </Label>
        </ModalBody>
        <ModalFooter>
            <ButtonGroup
                size="sm"
            >
                <Button
                    type="primary"
                    onClick={performValidation}
                >
                    {messageFormater("dataValidationButton")}
                </Button>
                <Button
                    onClick={close}
                >
                    {messageFormater("cancelValidationButton")}
                </Button>
            </ButtonGroup>
        </ModalFooter>
    </Modal>;
}));

export interface IDataValidatorMethods {
    startValidation: (layerVerificationTables: Array<IlayerVerificationTable>, sublayer: __esri.Sublayer) => void;
    close: () => void;
}

export interface IDataValidatorProps {
    /** - Prvky podle kterých se ověřují práva uživatele na potvrzení platnosti dat. */
    layerRightsFeatures: Array<{
            /** - Prvky podle kterých se ověřují práva uživatele na potvrzení platnosti dat. */
        featureSet: __esri.FeatureSet;
        /** - Definice vrstvy 'Správci vrstev' ze které {@link featureSet prvky} pocházejí. */
        tableDefinition: HSI.DbRegistry.ITableOfContentsDbValue[string]['dataValidity']['layerRightsTables'][number];
    }>;
}

export interface IlayerVerificationTable {
    table: __esri.FeatureLayer;
    definition: HSI.DbRegistry.ITableOfContentsDbValue[string]['dataValidity']['layerVerificationTables'][number]
}