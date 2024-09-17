import { React } from "jimu-core";
import { Button, ButtonGroup, Tooltip, Icon } from "jimu-ui";
import { JimuMapViewContext, AssetsProviderContext } from "widgets/shared-code/contexts";
import { SketchHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";

/** - Komponenta starajicí se o vykreslení geometrie do mapy. */
export default React.forwardRef<IDrawGeometry, IDrawGeometryProps>(function (props, ref) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);
    /** - Reference nástroje pro kreslení geometrie. */
    const sketchRef = React.useRef<__esri.SketchViewModel>();
    /** - Typ geometrie, která se vykresluje pomocí nástroje {@link sketchRef}. */
    const [activeGeometryType, setActiveGeometryType] = React.useState<EGeometryType>();
    const assetsProvider = React.useContext(AssetsProviderContext);
    /** - Reference funckce {@link props.onDraw}. */
    const onDrawRef = React.useRef<IDrawGeometryProps['onDraw']>();

    React.useEffect(() => {
        onDrawRef.current = props.onDraw;
    });

    /** - Načtění nástroje pro kreslení geometrie {@link sketchRef}. */
    React.useEffect(() => {
        let isActive = true;
        let graphicsLayer: __esri.GraphicsLayer;
        const listeners: Array<IHandle> = [];

        SketchHelper.loadSketch(jimuMapView, true)
            .then(sketch => {
                if (isActive) {
                    graphicsLayer = sketch.layer;
                    graphicsLayer.title = messageFormater("_widgetLabel");
                    jimuMapView.view.map.add(graphicsLayer);
                    sketchRef.current = sketch;
                    listeners.push(
                        sketch.on("create", ev => {
                            if (ev.state === "complete") {
                                setActiveGeometryType(null);
                                onDrawRef.current(ev.graphic?.geometry);
                            }
                        }),
                        sketch.on("update", ev => {
                            if (ev.state === "complete") {
                                onDrawRef.current(ev.graphics?.[0]?.geometry);
                            }
                        })
                    )
                }
            })
            .catch(err => {
                console.warn(err);
                if (isActive) {
                    NotificationHelper.createAddNotificationAction({ message: messageFormater("loadSketchFailde"), type: "error" });
                }
            });

        return function() {
            isActive = false;
            if (sketchRef.current && !sketchRef.current.destroyed) {
                sketchRef.current.destroy();
            }

            for (let listener of listeners) {
                listener.remove();
            }

            if (!!graphicsLayer) {
                jimuMapView.view.map.remove(graphicsLayer);
            }
            sketchRef.current = undefined;
        }

    }, [jimuMapView]);

    /** - Při změně aktivní geometrie {@link activeGeometryType} se aktivuje nástroj pro zakreslení geometrie {@link sketchRef}. */
    React.useEffect(() => {
        if (!!sketchRef.current) {
            if (activeGeometryType && props.canDraw) {
                sketchRef.current.layer.removeAll();
                sketchRef.current.create(activeGeometryType);
            }

            return function () {
                if (!!sketchRef.current) {
                    sketchRef.current.cancel();
                }
            }
        }
    }, [activeGeometryType, props.canDraw]);

    /** - Naplnění reference {@link ref} funckemi. */
    React.useImperativeHandle(ref, () => ({
        getGeometry() {
            return sketchRef.current?.layer?.graphics?.getItemAt(0)?.geometry;
        }
    }), []);

    /**
     * - Změna typu geometrie {@link activeGeometryType}.
     * @param geometryType - Typ geometrie, na který chceme měnit. 
     */
    function onGeometryTypeClick(geometryType: EGeometryType) {
        if (props.canDraw && geometryType === activeGeometryType) {
            setActiveGeometryType(null);
        } else {
            setActiveGeometryType(geometryType);
            props.onGeometryChange();
        }
    }

    return <ButtonGroup
        size="sm"
    >
        <Tooltip title={messageFormater("pointButtonTitle")} >
            <Button
                active={props.canDraw && activeGeometryType === EGeometryType.point}
                onClick={() => onGeometryTypeClick(EGeometryType.point)}
            >
                <Icon icon={assetsProvider("select-point.svg")} />
            </Button>
        </Tooltip>
        <Tooltip title={messageFormater("polylineButtonTitle")} >
            <Button
                active={props.canDraw && activeGeometryType === EGeometryType.polyline}
                onClick={() => onGeometryTypeClick(EGeometryType.polyline)}
            >
                <Icon icon={assetsProvider("select-line.svg")} />
            </Button>
        </Tooltip>
        <Tooltip title={messageFormater("polygontButtonTitle")} >
            <Button
                active={props.canDraw && activeGeometryType === EGeometryType.polygon}
                onClick={() => onGeometryTypeClick(EGeometryType.polygon)}
            >
                <Icon icon={assetsProvider("select-lasso.svg")} />
            </Button>
        </Tooltip>
    </ButtonGroup>;
})

/** - Typy geometrie, které lze vykreslit. */
enum EGeometryType {
    /** - Bod. */
    point = "point",
    /** - Linie. */
    polygon = 'polygon',
    /** - Polygon. */
    polyline = 'polyline'
}

interface IDrawGeometryProps {
    /** - Funkce, která se zavolá při vykreslení geometrie. */
    onDraw: (geometry: __esri.Geometry) => void;
    /** - Funkce která se zavolá při aktivaci/změně typu geometrie. */
    onGeometryChange: () => void;
    /** - je nástroj aktivní? */
    canDraw: boolean;
}

export interface IDrawGeometry {
    /** - Poskytuje vykreslenou geometrii. */
    getGeometry: () => __esri.Geometry;
}