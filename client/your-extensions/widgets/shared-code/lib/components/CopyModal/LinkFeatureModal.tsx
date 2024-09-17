import { React } from "jimu-core";
import { Modal, ModalBody, ModalHeader } from "jimu-ui";
import { DbRegistryLoader } from "widgets/shared-code/helpers";
import { CopyFeatureInput } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

/** - Dialog zobrazujicí dialog s odkazem na prvek. */
export default React.memo(React.forwardRef<HSI.LinkFeatureModalComponent.ILinkFeatureModalMethods>(function(props, ref) {
    const [state, setState] = React.useState<IState>({ isOpen: false, includeRedirector: false });
    const jimuMapView = React.useContext(JimuMapViewContext);

    /** - Naplnění referenfe funkcí pro otevření dialogu. */
    React.useImperativeHandle(ref, () => ({
        open(feature) {
            DbRegistryLoader
                .fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RedirectAppUrl, scope: "g", type: "string" })
                .then(redirectAppUrl => {
                    setState({
                        isOpen: true,
                        feature,
                        includeRedirector: typeof redirectAppUrl === "string" && redirectAppUrl.trim().length > 0 // Pokud v konfiguraci existuje "Redirect" aplikace, tak ji chceme použít.
                    });
                });
        }
    }), [jimuMapView]);

    /** - Zavření dialogu. */
    function close() {
        setState(s => ({ isOpen: false, includeRedirector: s.includeRedirector }));
    }

    return <Modal
        isOpen={state.isOpen}
        toggle={close}
    >
        {
            /** @todo - Překlady */
            <ModalHeader toggle={close}>Odkaz aplikace</ModalHeader>
        }
        <ModalBody>
            {
                state.includeRedirector ? <>
                    <CopyFeatureInput
                        /** @todo - Překlady */
                        label="Do již otevřeného okna prohlížeče"
                        feature={state.isOpen ? state.feature : null}
                        useRedirector={true}
                    />
                    <br/>
                    <CopyFeatureInput
                        /** @todo - Překlady */
                        label="Vždy do nového okna prohlížeče"
                        feature={state.isOpen ? state.feature : null}
                        useRedirector={false}
                    />
                </> : <CopyFeatureInput feature={state.isOpen ? state.feature : null} useRedirector={false} />
            }
        </ModalBody>
    </Modal>;
}));

type IState = IStateBase<false> | IOpenState;

interface IOpenState extends IStateBase<true> {
    /** - Prvek na který vytváříme odkaz. */
    feature: __esri.Graphic
}

interface IStateBase<B extends boolean> {
    /** - Je dialog otevřený? */
    isOpen: B;
    /** - Má se (pokud je v konfiguraci) vygenerovat i odkaz na {@link EDbRegistryKeys.RedirectAppUrl "Redirector" aplikaci}? */
    includeRedirector: boolean;
}