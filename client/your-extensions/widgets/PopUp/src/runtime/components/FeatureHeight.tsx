import { React } from "jimu-core";
import { Alert } from "jimu-ui";
import { ELoadStatus } from  "widgets/shared-code/enums";
import { GeometryHelper, ArcGISJSAPIModuleLoader } from  "widgets/shared-code/helpers";
import Loader from "./Loader";

/** - Komponenta, která načítající a zobrazující výšku terénu z {@link IProps.heightServiceUrl ČÚZK služby}, v místě {@link IProps.graphic prvku}. */
export default function(props: IProps) {
    const [height, setHeight] = React.useState<number>();
    const [loadStatus, setLoadStatus] = React.useState<ELoadStatus>(ELoadStatus.Pending);

    React.useEffect(() => {
        const abortController = new AbortController();

        (async function() {
            try {
                setLoadStatus(ELoadStatus.Pending);

                const request = await ArcGISJSAPIModuleLoader.getModule("request");
        
                const response = await request(props.heightServiceUrl, {
                    query: {
                        f: "json",
                        geometry: JSON.stringify(props.graphic.geometry.toJSON()),
                        geometryType: GeometryHelper.getGeometryType(props.graphic.geometry),
                    },
                    signal: abortController.signal
                });

                setHeight(parseFloat((response.data as HSI.IIdentifyResponse)?.value));
                setLoadStatus(ELoadStatus.Loaded);
            } catch(err) {
                if (!abortController.signal.aborted) {
                    setLoadStatus(ELoadStatus.Error);
                    console.warn(err);
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [props.graphic, props.heightServiceUrl]);

    switch(loadStatus) {
        case ELoadStatus.Loaded:
            return <>{height}</>;
        case ELoadStatus.Pending:
            return <Loader/>;
        case ELoadStatus.Error:
            return <Alert
                type="warning"
                closable={false}
                withIcon
                open
                size="small"
                text={props.errorMessage}
            />;
        default:
            console.warn(`Unhandled load status: ${loadStatus}`);
            return <></>;
    }
}

interface IProps extends Pick<HSI.DbRegistry.IPopupHeightDbValue, "heightServiceUrl"> {
    /** - Prvek pro který zjišťujeme výšku. */
    graphic: __esri.Graphic;
    /** - Hláška, která se zobrazí pokud nastane chyba při vyhledávání výšky. */
    errorMessage: string;
}