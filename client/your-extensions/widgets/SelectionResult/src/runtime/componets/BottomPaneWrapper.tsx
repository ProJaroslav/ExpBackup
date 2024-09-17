import { React } from "jimu-core";
import { Card, CardBody } from "jimu-ui";
import { Suspense, ErrorBoundary } from "widgets/shared-code/components";
import { IBottomPaneProps } from "./BottomPane";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
const BottomPane = React.lazy(() => import("./BottomPane"));

/** - Spodní část widgetu. */
export default function(props: IBottomPaneProps) {
    return <Card className="bottom-pane" >
        <CardBody>
            { !props.selectedFeatures?.type || props.selectedFeatures.type === ESelectedFeaturesType.Empty ? <></> : (
                <ErrorBoundary errorMessageTitle="" >
                    <Suspense>
                        <BottomPane selectedFeatures={props.selectedFeatures} />
                    </Suspense>
                </ErrorBoundary>
            ) }
        </CardBody>
    </Card>;
}