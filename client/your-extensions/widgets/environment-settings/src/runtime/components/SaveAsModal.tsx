import { React, utils, getAppStore } from "jimu-core";
import { Modal, ModalBody, ModalFooter, ModalHeader, Button } from "jimu-ui";
import { LayerHelper, LayerDefinitionHelper, SelectionHelper } from "widgets/shared-code/helpers";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { WarningContent } from "widgets/shared-code/components";
import { ELoadStatus } from "widgets/shared-code/enums";
import { CalciteLabel, CalciteInputText, CalciteLoader } from "calcite-components";
import translations from "../translations/default";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { storeEnvironment } from "../helpers/store";

/** - Tlačítko vyvolávající modální okno pro vytvoření nového prostředí. */
export default function(props: HSI.EnvironmentSettingsWidget.ISaveAsModalProps) {
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const [state, setState] = React.useState<IState>(defaultState);
    const config = useConfig<HSI.EnvironmentSettingsWidget.IMConfig>();

    /** - Zavření modálního okna. */
    function close() {
        if (state.savingState !== ELoadStatus.Pending) {
            setState(defaultState);
        }
    }

    /** - Uložení prostředí. */
    async function saveEnvironment() {
        const environmentName = state.environmentName;
        try {
            
            setState({ isOpen: true, environmentName, savingState: ELoadStatus.Pending });

            /** - Asynchronní načtení vybíratelnosti a viditelnosti všech vrstev v tomto prostředí. */
            const promises: Array<Promise<HSI.EnvironmentSettingsWidget.IEnvironment['layers'][number]>> = []

            LayerHelper.getAllMapImageLayers(jimuMapView).forEach(mapImageLayer => {
                promises.push(
                    LayerDefinitionHelper
                        .getMapImageLayerDefinition(mapImageLayer)
                        .then((definition): HSI.EnvironmentSettingsWidget.ILayerEnvironmentSetting => ({
                            ...definition,
                            visible: mapImageLayer.visible
                            
                        }))
                );
            });

            const { selectableLayers } = SelectionManager.getSelectionSet(jimuMapView).selectionState;

            LayerHelper.getAllSublayers(jimuMapView).forEach(sublayer => {
                promises.push(
                    LayerDefinitionHelper
                        .getSublayerDefiniton(sublayer)
                        .then((definition): HSI.EnvironmentSettingsWidget.ISublayerEnvironmentSetting => ({
                            ...definition,
                            visible: sublayer.visible,
                            selectable: selectableLayers.includes(LayerHelper.getGisIdLayersFromLayer(sublayer))
                        }))
                );
            });

            /** - Vybíratelnost a viditelnost všech vrstev v tomto prostředí.*/
            const layers = await Promise.all(promises);

            const newEnvironment: HSI.EnvironmentSettingsWidget.IEnvironment = {
                extent: jimuMapView.view.extent.toJSON(),
                viewpoint: jimuMapView.view.viewpoint.toJSON(),
                title: environmentName,
                id: utils.getUUID(),
                layers
            };

            await storeEnvironment(newEnvironment, config.appKey);

            props.onEnvironmetSaved(newEnvironment);

            setState(defaultState);
        } catch(err) {
            console.warn(err);
            setState({ isOpen: true, environmentName, saveError: err, savingState: ELoadStatus.Error });
        }
    }

    /** - Poskytnutí těla modálního okna. */
    function getBody() {
        if (state.savingState === ELoadStatus.Pending) {
            return <CalciteLoader label="" scale="l"/>;
        }

        const input = <CalciteLabel>
            {messageFormater("environmentNameLabel")}
            <CalciteInputText
                required
                status={state.savingState === ELoadStatus.Error ? "invalid" : "valid"}
                placeholder={messageFormater("environmentNamePlaceholder")}
                onCalciteInputTextInput={ev => setState({ isOpen: true, environmentName: ev.target.value })}
                value={state.environmentName}
            />
        </CalciteLabel>;

        if (state.savingState === ELoadStatus.Error) {
            return <>
                {input}
                <WarningContent
                    title={messageFormater("filedToSaveEnvironment")}
                    message={state.saveError instanceof Error ? state.saveError.message : state.saveError}
                />
            </>;
        }

        return input
    }
    
    return <>
        <Button
            disabled={props.disabled}
            onClick={() => setState({ isOpen: true })}
        >
            {messageFormater("saveAsButton")}
        </Button>
        <Modal isOpen={state.isOpen} toggle={close}>
            <ModalHeader toggle={close}></ModalHeader>
            <ModalBody>{getBody()}</ModalBody>
            <ModalFooter>
                <Button
                    type="primary"
                    disabled={!state.environmentName || state.savingState === ELoadStatus.Pending}
                    onClick={saveEnvironment}
                >
                    {messageFormater("saveEnvironmentButton")}
                </Button>
                <Button
                    onClick={close}
                    disabled={state.savingState === ELoadStatus.Pending}
                >
                    {messageFormater("cancelSaveEnvironmentButton")}
                </Button>
            </ModalFooter>
        </Modal>
    </>;
}

interface IState {
    /** - Je modál otevřený? */
    isOpen: boolean;
    /** - Název nového prostředí. */
    environmentName?: string;
    /** - Stav ukládání prostředí. */
    savingState?: ELoadStatus;
    /** - Chyba při ukládání prostředí. */
    saveError?: Error;
}

const defaultState: IState = {
    isOpen: false
}