import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import translations from "../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, FeatureHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { CalciteLoader } from "@esri/calcite-components-react";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";
/**
 * - Tlačítko, které nad určitými atributy (definováno v konfiguraci) aplikuje "attribute rules".
 * - Aplikace "attribute rules" probíhá tak, že se hodnota atributů nastaví na null, čímž se "attribute rules" automaticky naplní.
 * - Prakticky se jedná o vynulování určitých atributů s tím, že doufáme, že se automaticky naplní.
 */
export default function(props: IApplyAttributeRulesButtonProps) {
    const messageFormater = useMessageFormater(translations);
    /** - Je otevřen potvrzovací dialog pro attribute rules? */
    const [isModalOpened, toggleModalOpenState] = React.useState<boolean>(false);
    /** - Probíhá aplikace attribute rules? */
    const [applyingAttributeRuels, toggleApplyingAttributeRuels] = React.useState<boolean>(false);
    const layerConfiguration = React.useContext(LayerConfigurationContext);
    const jimuMapView = React.useContext(JimuMapViewContext);

    if (!props.features || (Array.isArray(props.features) && props.features.length < 1) || !Array.isArray(layerConfiguration.attributeRulesAttributes) || layerConfiguration.attributeRulesAttributes.length < 1 || !layerConfiguration.allowAttributeRules) {
        return <></>;
    }

    /** - Aplikace attribute rules nad {@link props.features prvky}. */
    async function applyAttributeRules() {
        try {
            toggleApplyingAttributeRuels(true);
            const attributes = {};
            for (let attributeName of layerConfiguration.attributeRulesAttributes) {
                attributes[attributeName] = null;
            }

            await FeatureHelper.updateAttributes(jimuMapView, props.features, attributes);

        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: messageFormater("failedToApplyAttributeRules"), type: "error" });
        } finally {
            toggleApplyingAttributeRuels(false);
            toggleModalOpenState(false);
        }
    }

    return <>
        <Button
            size="sm"
            onClick={() => toggleModalOpenState(true)}
        >
            {messageFormater("applyAttributeRulesButton")}
        </Button>
        <Modal
            isOpen={isModalOpened}
        >
            <ModalHeader>
                {messageFormater("applyAttributeRulesModalHeader")}
            </ModalHeader>
            <ModalBody>
                {
                    applyingAttributeRuels ? (
                        <CalciteLoader
                            label="applyAttributeRules"
                            text={messageFormater('applyingAttributeRulesMessage')}
                            type="indeterminate"
                            scale="m"
                        />
                    ) : messageFormater("applyAttributeRulesConfirmMessage")
                }
            </ModalBody>
            <ModalFooter>
                <Button
                    type="primary"
                    onClick={applyAttributeRules}
                >
                    {messageFormater("applyAttributeRulesYesResponseButton")}
                </Button>
                <Button
                    type="danger"
                    onClick={() => toggleModalOpenState(false)}
                >
                    {messageFormater("applyAttributeRulesNoResponseButton")}
                </Button>
            </ModalFooter>
        </Modal>
    </>;
}

interface IApplyAttributeRulesButtonProps {
    /**
     * - Prvky pro které chceme aplikovat "attribute rules".
     * - Všechny prvky musejí pocházet ze stejné vrstvy.
     */
    features: Array<__esri.Graphic> | __esri.Graphic;
}