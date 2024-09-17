import { React, AllWidgetProps } from "jimu-core";
import { Card, CardBody } from "jimu-ui";
import { WidgetWrapper } from "widgets/shared-code/components";
import "./widget.scss";

const LayerTree = React.lazy(() => import("./components/LayerTree"));

/**
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget(props: AllWidgetProps<{}>) {
    return <Card className="widget-TableOfContents">
        <CardBody className="widget-body">
            <LayerTree/> 
        </CardBody>
    </Card>;
}
  
export default WidgetWrapper(Widget, { usePopper: true, lazy: true, hasAssets: true, ignoreJimuMapView: false, provideConfiguration: true });