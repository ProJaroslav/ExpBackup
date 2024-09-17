import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import translations from "../translations/default";
import { useMessageFormater, useDisplayFeature } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { NotificationHelper, FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import { CalciteLoader } from "@esri/calcite-components-react";

/** - Tlačítko, které vyvolává mazání prvků. */
export default function(props: IDeleteFeaturesButtonProps) {
    const messageFormater = useMessageFormater(translations);
    const [isModalOpened, toggleModalOpenState] = React.useState<boolean>(false);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const [isRemoving, toggleIsRemoving] = React.useState<boolean>(false);
    const displayFeature = useDisplayFeature();

    React.useEffect(() => {
        toggleModalOpenState(false);
        toggleIsRemoving(false);
    }, [props.features]);

    /** - Poskytuje název vrstvy ze které pochází {@link props.features odebírané prvky}. */
    function getLayerTitle(): string {
        try {
            return LayerHelper.getSourceLayerFromFeature(props.features[0]).title;
        } catch(err) {
            console.warn(err);
        }
    }

    /** - Potvzení odebrání prvku. */
    async function removeFeature() {
        try {
            toggleIsRemoving(true);
            await FeatureHelper.deleteFeatures(jimuMapView, props.features);
        } catch(err) {
            console.warn(err);
            NotificationHelper.addApplyEditsErrorNotification(messageFormater(props.features.length === 1 ? "failedToRemoveFeature" : "failedToRemoveFeatures"), err);
        } finally {
            toggleModalOpenState(false);
            toggleIsRemoving(false);
        }
    }

    /** - Poskytuje text zobrazující se při mazání {@link props.features prvků}. */
    function getRemovingContent() {
        return messageFormater(props.features.length === 1 ? 'removingFeature' : "removingFeatures");
    }

    /** - Poskytuje text zobrazující se potvrzovacím dialogu. */
    function getConfirmationMessage() {
        if (props.features.length === 1) {
            return messageFormater("areYouCertainToRemoveFeature")?.replace("{0}", displayFeature(props.features[0]))?.replace("{1}", getLayerTitle());
        }

        return messageFormater("areYouCertainToRemoveFeatures")?.replace("{0}", getLayerTitle());
    }

    return <>
        <Button
            size="sm"
            onClick={() => toggleModalOpenState(true)}
        >
            {messageFormater("removeFeatureButton")}
        </Button>

        <Modal
            isOpen={isModalOpened}
        >
            <ModalHeader closeIcon={0} >{messageFormater(props.features.length === 1 ? "removeFeatureModalHeader" : "removeFeaturesModalHeader")}</ModalHeader>
            <ModalBody>
                {
                    isRemoving ? <CalciteLoader
                        label="removeFeature"
                        text={getRemovingContent()}
                        type="indeterminate"
                        scale="m"
                    /> : getConfirmationMessage()}
            </ModalBody>
            {
                isRemoving ? <></> : <ModalFooter>
                    <Button
                        onClick={removeFeature}
                        type="primary"
                    >
                        {messageFormater("removeFeatureYesResponseButton")}
                    </Button>
                    <Button
                        onClick={() => toggleModalOpenState(false)}
                        type="danger"
                    >
                        {messageFormater("removeFeatureNoResponseButton")}
                    </Button>
            </ModalFooter>
            }
        </Modal>
    </>;
}

interface IDeleteFeaturesButtonProps {
    /**
     * - Prvky, které chceme odebrat.
     * - Prvky musejí pocházet z jedné vrstvy.
     */
    features: Array<__esri.Graphic>;
}