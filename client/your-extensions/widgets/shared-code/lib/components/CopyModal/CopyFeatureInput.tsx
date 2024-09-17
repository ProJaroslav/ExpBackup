import { React } from "jimu-core";
import { Label, Alert } from "jimu-ui";
import { FeatureHelper } from "widgets/shared-code/helpers";
import { CopyInput } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - Vytvoří odkaz na aplikaci s prvkem ve výberu a zobrazí ho v needitovatelném textovém poli s tlačítkem pro zkopírování. */
export default function(props: ICopyFeatureInputProps) {
    const [state, setState] = React.useState<IState>({ loadingState: ELoadStatus.Pending });
    const jimuMapView = React.useContext(JimuMapViewContext);

    React.useEffect(() => {
        if (!!props.feature) {
            let isActive = true;

            setState({ loadingState: ELoadStatus.Pending });
            (async function() {
                try {
                    const link = await FeatureHelper.generateLink(jimuMapView, props.feature, props.useRedirector);

                    if (isActive) {
                        setState({ loadingState: ELoadStatus.Loaded, link });
                    }
                } catch(error) {
                    console.warn(error);
                    setState({ loadingState: ELoadStatus.Error, error });
                }
            })();

            return function() {
                isActive = false;
            }
        }
    }, [props.feature, props.useRedirector, jimuMapView]);

    
    let content: JSX.Element;

    if (state.loadingState === ELoadStatus.Error) {
        content = <Alert
            type="error"
            /** @todo - Překlady */
            text="Odkaz se nepodařilo vygenerovat"
            withIcon
        />;
    } else {
        content = <CopyInput
            text={state.loadingState === ELoadStatus.Loaded ? state.link : ""}
            loading={state.loadingState === ELoadStatus.Pending}
        />;
    }


    if (!!props.label) {
        return <Label className="w-100">
            {props.label}
            {content}
        </Label>;
    }

    return content;
}

interface ICopyFeatureInputProps {
    /** - Popis pole. */
    label?: string;
    /** - Prvek na který vytváříme odkaz. */
    feature: __esri.Graphic;
    /** - Má se (pokud je v konfiguraci) odkaz generovat na {@link EDbRegistryKeys.RedirectAppUrl "Redirector" aplikaci}? */
    useRedirector: boolean;
}

type IState = IStateBase<ELoadStatus.Pending> | ILoadedState | IErrorState;

interface IStateBase<L extends ELoadStatus> {
    /** - Stav načtění odkazu. */
    loadingState: L;
}

interface ILoadedState extends IStateBase<ELoadStatus.Loaded> {
    /** - Odkaz na aplikaci. */
    link: string;
}

interface IErrorState extends IStateBase<ELoadStatus.Error> {
    /** - Odchycená výjimka. */
    error: Error;
}