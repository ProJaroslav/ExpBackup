import { React } from "jimu-core";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "jimu-ui";
import { CalciteLoader } from "calcite-components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper } from "widgets/shared-code/helpers";
import translations from "./translations/default";

const { forwardRef, useImperativeHandle, useState } = React;

/** - Okno pro potvrzení smazání prvku. */
export default forwardRef<HSI.DeleteModal.IMethods, HSI.DeleteModal.IProps>(function({ header, noMessage, yesMessage, confirmationMessage, deleteFeature }, ref) {
    const [state, setState] = useState<HSI.DeleteModal.IState>({ isOpen: false, showLoading: false });
    const messageFormater = useMessageFormater(translations);

    useImperativeHandle(ref, () => ({
        open() {
            setState({ isOpen: true, showLoading: false });
        },
    }), [setState]);

    async function removeFeature() {
        try {
            setState({ isOpen: true, showLoading: true });
            await deleteFeature();
            setState({ isOpen: false, showLoading: true });
            NotificationHelper.addNotification({ type: "success", title: messageFormater("deleteModalSuccessMessage") });
        } catch(err) {
            console.warn(err);
            setState({ isOpen: true, showLoading: false });
            NotificationHelper.handleError(messageFormater("deleteModalFailedMessage"), err);
        }
    }

    return <Modal
        isOpen={state.isOpen}
        centered
    >
        <ModalHeader closeIcon={0} >{typeof header === "string" ? header : messageFormater("deleteModalHeader")}</ModalHeader>
        <ModalBody>
            {
                state.showLoading ? <CalciteLoader
                    label="removeFeature"
                    type="indeterminate"
                    scale="m"
                /> : <h6>{typeof confirmationMessage === "string" ? confirmationMessage : messageFormater("deleteModalConfirmationMessage")}</h6>}
        </ModalBody>
        {
            <ModalFooter>
                <Button
                    onClick={removeFeature}
                    disabled={state.showLoading}
                    type="primary"
                >
                    {typeof yesMessage === "string" ? yesMessage : messageFormater("deleteModalYesButton")}
                </Button>
                <Button
                    disabled={state.showLoading}
                    onClick={() => setState({ isOpen: false, showLoading: false })}
                    type="danger"
                >
                    {typeof noMessage === "string" ? noMessage : messageFormater("deleteModalNoButton")}
                </Button>
        </ModalFooter>
        }
    </Modal>;
});