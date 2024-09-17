import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import { EditTable } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";
import "./EditWindow.scss";

const { useRef, useState } = React;

/** - Okno pro editaci prvku. */
export default function({ failedToSaveMessage, loadMetadataErrorMessage, requiredValueMissing, saveSuccessMessage, dataProvider, isOpen, close, saveFeature, cancelButton, modalHeader, saveButton }: HSI.EditWindowComponent.IProps) {
    const editTableRef = useRef<HSI.EditTableComponent.IRef>();
    const messageFormater = useMessageFormater(translations);
    const [isSaving, toggleSaving] = useState<boolean>(false);

    return <Modal
        modalClassName="hsi-edit-table-modal"
        centered
        isOpen={isOpen}
        toggle={close}
    >
        <ModalHeader toggle={close}>{modalHeader || messageFormater("editModalHeader")}</ModalHeader>
        <ModalBody>
            <EditTable
                failedToSaveMessage={failedToSaveMessage}
                loadMetadataErrorMessage={loadMetadataErrorMessage}
                requiredValueMissing={requiredValueMissing}
                saveSuccessMessage={saveSuccessMessage}
                ref={editTableRef}
                setTableStateOpen={open => {
                    if (open) {
                        editTableRef.current.load(dataProvider);
                    }
                }}
            />
        </ModalBody>
        <ModalFooter>
            <Button
                type="primary"
                disabled={isSaving}
                onClick={() => {
                    editTableRef.current.save(async function(...args) {
                        try {
                            toggleSaving(true)
                            await saveFeature(...args);
                            toggleSaving(false)
                        } catch(err) {
                            toggleSaving(false)
                            throw err;
                        }
                    });
                }}
            >
                {saveButton || messageFormater("saveEditButton")}
            </Button>
            <Button onClick={close}>
                {cancelButton || messageFormater("cancelEditButton")}
            </Button>
        </ModalFooter>
    </Modal>;
}