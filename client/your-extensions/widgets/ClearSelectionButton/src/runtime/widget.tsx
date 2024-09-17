import { React, type AllWidgetProps } from "jimu-core"
import { useHsiSelectionEmpty } from "widgets/shared-code/hooks";
import { WidgetWrapper, OnScreenButton } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import SelectionManager from "widgets/shared-code/SelectionManager";

/**
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget(props: AllWidgetProps<{}>) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const isSelectionEmpty = useHsiSelectionEmpty();

    return <OnScreenButton
        icon={props.icon}
        name={props.manifest.name}
        title={props.label}
        widgetId={props.widgetId}
        disabled={isSelectionEmpty}
        onClick={() => {
            if (!isSelectionEmpty) {
                SelectionManager.getSelectionSet(jimuMapView).dropSelection();
            }
        }}
    />;
}
  
export default WidgetWrapper(Widget, { hasAssets: true });