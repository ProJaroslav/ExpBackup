import { React } from "jimu-core";
import { Modal, ModalBody, ModalHeader } from "jimu-ui";
import { CopyInput } from "widgets/shared-code/components";

/** - Dialog zobrazujicí needitovatelné textové pole s tlačítkem pro zkopírování jeho obsahu. */
export default React.memo(React.forwardRef<ICopyLinkModalMethods>(function(props, ref) {
    const [state, setState] = React.useState<IState>({ isOpen: false });

    /** - Naplnění referenfe funkcí pro otevření dialogu. */
    React.useImperativeHandle(ref, () => ({
        open(text, title) {
            setState({ text, isOpen: true, title });
        }
    }), []);

    /** - Zavření dialogu. */
    function close() {
        setState({ isOpen: false });
    }

    return <Modal
        isOpen={state.isOpen}
        toggle={close}
    >
        {
            state.title ? <ModalHeader toggle={close} >{state.title}</ModalHeader> : <></>
        }
        <ModalBody >
            <CopyInput
                text={state.text}
            />
        </ModalBody>
    </Modal>;
}));

interface IState {
    /** - Je dialog otevřený? */
    isOpen: boolean;
    /** Text, který chceme zobrazit v textovém poli. */
    text?: string;
    /** - Hlavička dislogu. */
    title?: string;
}

export interface ICopyLinkModalMethods {
    /**
     * - Funkce otevírajicí dialog.
     * - Vstup funkce je text, který chceme zobrazit v textovém poli.
     */
    open: (text: string, title?: string) => void;
    
}