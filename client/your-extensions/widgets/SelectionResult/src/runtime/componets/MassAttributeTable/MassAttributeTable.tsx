import { React } from "jimu-core";
import { LoadingType, Loading, Card, CardBody } from "jimu-ui";
import { Suspense, WarningContent } from "widgets/shared-code/components";
import {useConfig, useMessageFormater} from "widgets/shared-code/hooks";
import { ELoadStatus } from "widgets/shared-code/enums";
import translations from "../../translations/default";

const MassAttributeTableLoaded = React.lazy(() => import("./MassAttributeTableLoaded"));

/** - Hromadné zobrazení společných hodnot atributů prvků a jejich editace. */
export default function(props: IMassAttributeTableProps) {
    const [loadStatus, setLoadStatus] = React.useState<ELoadStatus>(ELoadStatus.Pending);
    const [error, setError] = React.useState<string>();
    const [featureCopy, setFeatureCopy] = React.useState<__esri.Graphic>();
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);

    React.useEffect(() => {
        let isActive = true;
        setLoadStatus(ELoadStatus.Pending);
        
        (async function() {
            try {
                if (isActive) {
                    const featureCopy = props.features[0].clone();
                    featureCopy.attributes = {...featureCopy.attributes};
                    delete featureCopy.geometry;

                    for (let feature of props.features) {
                        for (let attributeName of Object.keys(featureCopy.attributes)) {
                            if (feature.getAttribute(attributeName) !== featureCopy.getAttribute(attributeName)) {
                                featureCopy.setAttribute(attributeName, null);
                            }
                        }
                    }

                    setLoadStatus(ELoadStatus.Loaded);
                    setFeatureCopy(featureCopy);
                }
            } catch(err) {
                console.warn(err);
                if (isActive) {
                    setLoadStatus(ELoadStatus.Error);
                    setError((err as Error)?.message || err);
                }
            }
        })();

        return function() {
            isActive = false;
        }
    }, [props.features, props.tableFeature]);
    
    return <Suspense>
        <Card className="tab-card">
            {
                function() {
                    switch(loadStatus) {
                        case ELoadStatus.Error:
                            return <CardBody>
                                <WarningContent
                                    title={messageFormater("failedToLoadCommonAttributes")}
                                    message={error}
                                />
                            </CardBody>;
                        case ELoadStatus.Pending:
                            return <CardBody><Loading type={LoadingType.Primary} /></CardBody>;
                        case ELoadStatus.Loaded:
                            return <MassAttributeTableLoaded
                                {...props}
                                featureCopy={featureCopy}
                            />;
                        default:
                            console.warn(`Unhandled load status '${loadStatus}'`);
                            return <></>;
                    }
                }()
            }
        </Card>
    </Suspense>;
}

export interface IMassAttributeTableProps {
    /**
     * - Prvky jejichž atributy chceme zobrazit/editovat.
     * - Všechny prvky musejí pocházet ze stejné vrstvy.
     */
    features: Array<__esri.Graphic>;
    /** - Jedná se o negrafický prvek? */
    tableFeature?: boolean;
}