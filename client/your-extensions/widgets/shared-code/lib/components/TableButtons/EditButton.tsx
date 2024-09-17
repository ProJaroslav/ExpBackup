import { React, utils } from "jimu-core";
import { Button } from "jimu-ui";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { EditWindow } from "widgets/shared-code/components";
import translations from "../translations/default";

const { useState, useRef, forwardRef, useImperativeHandle } = React;

/** - Tlačítko pro editaci prvku. */
export default forwardRef<HSI.FeatureTableComponent.IEditButtonMethods, React.PropsWithChildren<HSI.FeatureTableComponent.IEditButton>>(function({ dataProvider, children, saveFeature, disabled, cancelButton, failedToSaveMessage, loadMetadataErrorMessage, modalHeader, requiredValueMissing, saveButton, saveSuccessMessage }, ref) {
    const [isOpen, toogleOpen] = useState<boolean>(false);
    const messageFormater = useMessageFormater(translations);
    const lastSaveIdRef = useRef<string>();

    useImperativeHandle(ref, () => ({
        close() {
            toogleOpen(false);
        },
    }), [toogleOpen]);

    async function doSaveFeature(feature: __esri.Graphic, fields: Array<__esri.Field>) {
        const saveId = lastSaveIdRef.current = utils.getUUID();
        await saveFeature(feature, fields);
        if (saveId === lastSaveIdRef.current) {
            toogleOpen(false);
        }
    }

    return <>
        <Button
            disabled={disabled}
            onClick={() => toogleOpen(true)}
        >{children || messageFormater("editButton")}</Button>
        <EditWindow
            isOpen={isOpen}
            close={() => toogleOpen(false)}
            dataProvider={dataProvider}
            saveFeature={doSaveFeature}
            cancelButton={cancelButton}
            failedToSaveMessage={failedToSaveMessage}
            loadMetadataErrorMessage={loadMetadataErrorMessage}
            modalHeader={modalHeader}
            requiredValueMissing={requiredValueMissing}
            saveButton={saveButton}
            saveSuccessMessage={saveSuccessMessage}
        />
        
    </>;
});