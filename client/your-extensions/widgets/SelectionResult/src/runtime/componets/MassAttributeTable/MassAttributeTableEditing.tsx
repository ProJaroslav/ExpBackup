import { React, utils } from "jimu-core";
import { ButtonGroup, Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import translations from "../../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { FeatureHelper, LayerHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { EFeatureType } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { IMassAttributeTableLoadedProps } from "./MassAttributeTableLoaded";

/** - Hromadná editace prvků. */
export default function(props: IMassAttributeTableEditingProps) {
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);
    /** - Výchozí hodnoty prvku {@link props.featureCopy} */
    const [unchangedAttributes, setUnchangedAttributes] = React.useState<__esri.Graphic['attributes']>();
    /**
     * - Unikátní identifikátor {@link props.featureCopy prvku}.
     * - Podle tohoto identifikátoru se určuje, zda během {@link saveChanges ukládání změn} došlo ke změně, a tudíž se nemají aktualizovat hodnoty state.
     */
    const activeFeatureIdRef = React.useRef<string>();
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Je otevřený dialog pro potvrzení hromadné editace? */
    const [isModalOpened, toggleModalOpenState] = React.useState<boolean>(false);

    /** - Při změně {@link props.featureCopy} se nastaví výchozí hodnoty prvku. */
    React.useEffect(() => {
        setUnchangedAttributes(props.featureCopy?.attributes ? {...props.featureCopy.attributes} : {});
        activeFeatureIdRef.current = utils.getUUID();
    }, [props.featureCopy, props.toggleEditing, activeFeatureIdRef]);
    
    /** - Zrušení editace a vynulování změn {@link props.featureCopy prvku}. */
    function stopEditing() {
        if (!props.isSaving) {
            props.toggleEditing(false);
            props.featureCopy.attributes = unchangedAttributes;
        }
    }

    /** - Uložení změn provedených v {@link props.featureCopy pomocném prvku} do {@link props.features prvků ve výběru}. */
    async function saveChanges() {
        const activeFeatureId = activeFeatureIdRef.current;
        try {
            for (let field of props.fields) {
                let value = props.featureCopy.attributes[field.field.name];
                if (field.editable && !field.field.nullable && !value && value !== 0) {
                    NotificationHelper.addNotification({ message: messageFormater("requiredAttributeMessage").replace("{0}", field.field.alias), type: "warning" });
                    return;
                }
            }

            props.toggleSaving(true);

            const attributesToUpdate = {};

            for (let attributeName in unchangedAttributes) {
                if (unchangedAttributes[attributeName] !== props.featureCopy.getAttribute(attributeName)) {
                    attributesToUpdate[attributeName] = props.featureCopy.getAttribute(attributeName);
                }
            }

            await FeatureHelper.updateAttributes(jimuMapView, props.features, attributesToUpdate);

            if (activeFeatureId === activeFeatureIdRef.current) {
                props.toggleSaving(false);
                props.toggleEditing(false);
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.addNotification({ message: messageFormater("saveAttributesFailed"), type: "error" });
            if (activeFeatureId === activeFeatureIdRef.current) {
                props.toggleSaving(false);
                setUnchangedAttributes({...props.featureCopy.attributes});
            }
        }
    }

    /** - Poskytuje název vrstvy ze které pocházejí {@link props.features prvky}. */
    function getLayerName(): string {
        try {
            return FeatureHelper.getFeatureType(props.features[0]) === EFeatureType.Table ? LayerHelper.getTableFromFeature(props.features[0]).title : LayerHelper.getSublayerFromFeature(props.features[0]).title;
        } catch(err) {
            console.warn(err);
        }
    }

    return <>
        <ButtonGroup>
            <Button
                size="sm"
                disabled={props.isSaving}
                active={props.isEditing}
                onClick={() => props.isEditing ? stopEditing() : toggleModalOpenState(true)}
            >
                {messageFormater("editAttributes")}
            </Button>
            <Button
                size="sm"
                disabled={!props.isEditing || props.isSaving}
                onClick={saveChanges}
            >
                {messageFormater("saveAttributeChanges")}
            </Button>
        </ButtonGroup>
        <Modal
            isOpen={isModalOpened}
        >
            <ModalHeader closeIcon={0} >{messageFormater("massEditHeader")}</ModalHeader>
            <ModalBody>
                {messageFormater("massEditConfirmationMessage")?.replace("{0}", getLayerName())}
            </ModalBody>
            {
                <ModalFooter>
                    <Button
                        onClick={() => {
                            props.toggleEditing(true);
                            toggleModalOpenState(false);
                        }}
                        type="primary"
                    >
                        {messageFormater("massEditConfirmYesResponseButton")}
                    </Button>
                    <Button
                        onClick={() => toggleModalOpenState(false)}
                        type="danger"
                    >
                        {messageFormater("massEditConfirmNoResponseButton")}
                    </Button>
                </ModalFooter>
            }
        </Modal>
    </>;
}

interface IMassAttributeTableEditingProps extends IMassAttributeTableLoadedProps {
    /** - Probíhá editace atributů? */
    isEditing: boolean;
    /** - Přepnutí aktivity editace atributů. */
    toggleEditing: (isEditing: boolean) => void;
    /** - Probíhá ukládání změn? */
    isSaving: boolean;
    /** - Přepnutí aktivity ukládání změn. */
    toggleSaving: (isEditing: boolean) => void;
    /** - Sloupce, které zobrazujeme v atributové tabulce. */
    fields: Array<HSI.SelectionResultWidget.IField>;
}