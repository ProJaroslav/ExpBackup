import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import translations from "../translations/default";
import { useMessageFormater, useDisplayFeature } from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { NotificationHelper, FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import { EFeatureType } from "widgets/shared-code/enums";
import { CalciteLoader } from "@esri/calcite-components-react";

/** - Tlačítko, které vyvolává mazání prvku. */
export default function(props: IDeleteFeatureButtonProps) {
    const messageFormater = useMessageFormater(translations);
    const [isModalOpened, toggleModalOpenState] = React.useState<boolean>(false);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const [isRemoving, toggleIsRemoving] = React.useState<boolean>(false);
    const displayFeature = useDisplayFeature();

    React.useEffect(() => {
        toggleModalOpenState(false);
        toggleIsRemoving(false);
    }, [props.feature]);

    /** - Poskytuje název vrstvy ze které pochází {@link props.feature odebíraný prvek}. */
    function getLayerTitle(): string {
        try {
            const featureType = FeatureHelper.getFeatureType(props.feature);
            switch(featureType) {
                case EFeatureType.Sublayer:
                    return LayerHelper.getSublayerFromFeature(props.feature).title;
                case EFeatureType.Table:
                    return LayerHelper.getTableFromFeature(props.feature).title;
                default:
                    throw new Error(`Unhandled feature type '${featureType}'`);
            }
        } catch(err) {
            console.warn(err);
        }
    }

    /** - Potvzení odebrání prvku. */
    async function removeFeature() {
        try {
            toggleIsRemoving(true);
            await FeatureHelper.deleteFeatures(jimuMapView, props.feature);
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: messageFormater("failedToRemoveFeature"), type: "error" });
        } finally {
            toggleModalOpenState(false);
            toggleIsRemoving(false);
        }
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
            <ModalHeader closeIcon={0} >{messageFormater("removeFeatureModalHeader")}</ModalHeader>
            <ModalBody>
                {
                    isRemoving ? <CalciteLoader
                        label="removeFeature"
                        text={messageFormater('removingFeature')}
                        type="indeterminate"
                        scale="m"
                    /> : messageFormater("areYouCertainToRemoveFeature")?.replace("{0}", displayFeature(props.feature))?.replace("{1}", getLayerTitle())}
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

interface IDeleteFeatureButtonProps {
    /** - Prvek, který chceme odebrat. */
    feature: __esri.Graphic;
}