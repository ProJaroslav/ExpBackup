import { DataSourceManager, ImmutableObject, React, type AllWidgetProps } from "jimu-core";
import { Select, Option } from "jimu-ui";
import { WidgetWrapper } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EConstants } from "widgets/shared-code/enums";
import { type InitialMapState } from "jimu-ui/advanced/map";
const { useContext, memo } = React;
import "./widget.scss";

function Widget(props: AllWidgetProps<HSI.EnvironmentProcessorWidget.IMConfig>) {
    return <div className={`widget-${props.manifest.name}`}>
        <PureWidget config={props.config} />
    </div>;
}

const PureWidget = memo<Pick<AllWidgetProps<HSI.EnvironmentProcessorWidget.IMConfig>, "config">>(({ config }) => {
    const jimuMapView = useContext(JimuMapViewContext);

    const currentItemId = DataSourceManager.getInstance().getDataSource(jimuMapView.dataSourceId).getDataSourceJson().itemId;
    const currentEnvironment = config.environments.find(({ scales }) => scales.some(({ itemId }) => currentItemId === itemId));
    const currentScaleId: string = currentEnvironment && currentEnvironment.scales.find(({ itemId }) => itemId === currentItemId).id;

    function selectEnvironment(ev: React.ChangeEvent<HTMLSelectElement>) {
        const url = new URL(location.toString());
        url.searchParams.set(EConstants.itemIdUrl, ev.target.value)
        if (config.preserveExtent) {
            const mapState: InitialMapState = {
                extent: jimuMapView.view.extent.toJSON(),
                viewPoint: jimuMapView.view.viewpoint.toJSON(),
                viewType: "2d",
                rotation: jimuMapView.view.viewpoint.rotation
            };
            url.searchParams.set(EConstants.mapStateUrl, JSON.stringify(mapState))
        }

        document.location.href = url.toString();
    }

    return <>
        <Select
            key="environment"
            size="sm"
            autoWidth={false}
            value={currentItemId}
            onChange={selectEnvironment}
        >
            {
                config.environments.map(({ label, scales }) => {
                    let scale: HSI.EnvironmentProcessorWidget.IEnvironmentScale | ImmutableObject<HSI.EnvironmentProcessorWidget.IEnvironmentScale> = scales.find(({ id }) => id === currentScaleId);
                    if (!scale) {
                        scale = scales[0];
                    }
                    if (!scale) {
                        return <></>;
                    }
                    return <Option key={scale.itemId} value={scale.itemId}>{label}</Option>;
                })
            }
        </Select>
        {
            function() {
                if (!currentEnvironment) {
                    return <></>;
                }
                return <Select
                    size="sm"
                    key="scale"
                    value={currentItemId}
                    onChange={selectEnvironment}
                >
                    {
                        currentEnvironment.scales.map(({ id, itemId }) => {
                            return <Option key={itemId} value={itemId}>{config.scales.find(scale => scale.id === id)?.label}</Option>
                        })
                    }
                </Select>;
            }()
        }
    </>;
});

export default WidgetWrapper(Widget);