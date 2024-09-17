import { type AllWidgetProps, React } from "jimu-core";
import { WidgetWrapper, WidgetBody, WarningContent } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { ELoadStatus } from "widgets/shared-code/enums";
import { NotificationHelper, SketchHelper, EsriHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "./translations/default";
import WidgetContent from "./components/WidgetContent";
import "./widget.scss";

const { useState, useEffect, useContext } = React;

const loadingState: HSI.LoadingState.IState<HSI.TextDrawWidget.IWidgetContentProps> = { loadStatus: ELoadStatus.Pending };

function Widget({ manifest }: AllWidgetProps<{}>) {
    const messageFormater = useMessageFormater(translations);
    const [sketchState, setSketchState] = useState<typeof loadingState>(loadingState);
    const jimuMapView = useContext(JimuMapViewContext);

    useEffect(() => {
        let isActive = true;
        setSketchState(loadingState);
        let sketch: __esri.Sketch;

        jimuMapView.view.map.layers.on("after-add", () => {
            console.log(jimuMapView.view.map.layers.toArray().map(layer => `${layer.id} - ${layer.title}`));
        });

        Promise.all([
            ArcGISJSAPIModuleLoader.getModule("TextSymbol"),
            SketchHelper .loadSketchWithUi(jimuMapView, false)
        ])
            .then(([TextSymbol, sketchWidget]) => {
                if (isActive) {
                    sketch = sketchWidget;
                    jimuMapView.view.map.add(sketch.layer);
                    sketch.visibleElements.settingsMenu = false;
                    sketch.labelOptions
                    sketch.availableCreateTools = ["point"];
                    setSketchState({
                        loadStatus: ELoadStatus.Loaded,
                        sketch,
                        TextSymbol
                    });
                }
            })
            .catch(err => {
                setSketchState({
                    errorMessage: NotificationHelper.getErrorMessage(err),
                    loadStatus: ELoadStatus.Error
                });
            });

        return function() {
            isActive = false;
            EsriHelper.removeLayerFromMap(jimuMapView, sketch?.layer);
            EsriHelper.destroy(sketch);
        }
    }, [setSketchState, jimuMapView]);

    return <WidgetBody
        widgetName={manifest.name}
        loading={sketchState.loadStatus === ELoadStatus.Pending}
    >
        {
            function() {
                switch(sketchState.loadStatus) {
                    case ELoadStatus.Error:
                        return <WarningContent
                            message={sketchState.errorMessage}
                            title={messageFormater("failedToLoadSketch")}
                        />;
                    case ELoadStatus.Loaded:
                        return <WidgetContent sketch={sketchState.sketch} TextSymbol={sketchState.TextSymbol} />;
                    default: <WarningContent
                        message={messageFormater("unhandledState").replace("{0}", sketchState.loadStatus)}
                        title={messageFormater("failedToLoadSketch")}
                    />;
                }
            }()
        }
    </WidgetBody>;
}

export default WidgetWrapper(Widget, { });