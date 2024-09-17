import { React, AllWidgetProps, ReactRedux } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translation from "./translations/default";
import { WidgetWrapper, OnScreenButton } from "widgets/shared-code/components";
import { JimuMapViewContext, AssetsProviderContext } from "widgets/shared-code/contexts";
import { SelectionHelper } from "widgets/shared-code/helpers";
import { EGeometryType, ESelectInOption, EGeometrySelect, ESelectionStateChange } from "widgets/shared-code/enums";

/**
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget(props: AllWidgetProps<{}>) {
    const formatMessage = useMessageFormater(translation);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const getAssetsPath = React.useContext(AssetsProviderContext);
    const state = ReactRedux.useSelector(() => SelectionHelper.getSelectionState(jimuMapView));
    
    /** - Poskytuje název souboru ikony podle {@link state.activeGeometrySelect} a {@link state.activeGeometryType}. */
    function getIconName(): string {
        if (state.activeGeometrySelect === EGeometrySelect.Copy || state.activeGeometrySelect === EGeometrySelect.CopyAll) {
            return "copy-feature.svg";
        }

        switch(state.activeGeometryType) {
            case EGeometryType.Point:
                return "select-point.svg";
            case EGeometryType.Polygon:
                return "select-lasso.svg";
            case EGeometryType.Rectangle:
                return "select-rectangle.svg";
        }
    }
    
    /** - Poskytuje název titulek podle {@link state.activeGeometrySelect} a {@link state.activeGeometryType}. */
    function getTitle(): string {
        let title: string;

        switch(state.activeGeometrySelect) {
            case EGeometrySelect.Copy:
                title = formatMessage("featureSelectButtonTitle");
                break;

            case EGeometrySelect.CopyAll:
                title = formatMessage("featureSelectAllButtonTitle");
                break;

            default:
                switch(state.activeGeometryType) {
                    case EGeometryType.Point:
                        title = formatMessage("pointSelectButtonTitle");
                        break;

                    case EGeometryType.Polygon:
                        title = formatMessage("polygonSelectButtonTitle");
                        break;

                    case EGeometryType.Rectangle:
                        title = formatMessage("rectangleSelectButtonTitle");
                        break;

                    default:
                        break;
                }

                switch(state.activeSelectInOption) {
                    case ESelectInOption.Layer:
                        title += `\n${formatMessage("layerOption")}`;

                        if (!!state.selectedLayerId && state.selectedLayerId in state.layerDictionary) {
                            title += ` (${state.layerDictionary[state.selectedLayerId].title})`;
                        }
                        break;

                    case ESelectInOption.Toc:
                        title += `\n${formatMessage("tocOption")}`;
                        break;

                    case ESelectInOption.Top:
                        title += `\n${formatMessage("topLayerOption")}`;
                        break;

                    default:
                        break;
                }

                break;
        }

        return title;
    }

    return <OnScreenButton
        icon={getAssetsPath(getIconName())}
        onClick={() => SelectionHelper.dispatchSelectionState(jimuMapView, { type: ESelectionStateChange.OnSelctButtonClicked })}
        title={getTitle()}
        active={state.isSelecting}
        disabled={!state.canSelect}
        widgetId={props.widgetId}
        name={props.manifest.name}
    />;
}
  
export default WidgetWrapper(Widget, { hasAssets: true });