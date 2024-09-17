import { React, AllWidgetProps, WidgetState } from "jimu-core";
import { CardBody, Card, Label, Radio, TextArea } from "jimu-ui"
import { WidgetWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import DrawGeometry, { IDrawGeometry } from "./components/DrawGeometry";
import FeatureFromSelection, { IFeatureFromSelection } from "./components/FeatureFromSelection";
import DisplayVertexes from "./components/DisplayVertexes";
import translations from "./translations/default";
import "./widget.scss";

/**
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget(props: AllWidgetProps<{}>) {
    const messageFormater = useMessageFormater(translations);
    /** - Aktivní druh získání geometrie jejiž souřadnice budeme převádět. */
    const [activeGraphicProvider, setActiveGraphicProvider] = React.useState(EGraphicProvider.Selection);
    /** - Reference komponenty {@link FeatureFromSelection}. */
    const featureFromSelectionRef = React.useRef<IFeatureFromSelection>();
    /** - Reference komponenty {@link DrawGeometry}. */
    const drawGeometryRef = React.useRef<IDrawGeometry>();
    /** - Geometrie jejíž souřadnice zobrazujeme. */
    const [selectedGeometry, setSelectedGeometry] = React.useState<__esri.Geometry>();
    
    /** - Výběr prvku z výběru komponentou {@link FeatureFromSelection}. */
    const onFeatureFromSelectionSelect = React.useCallback(function (feature: __esri.Graphic) {
        if (feature || activeGraphicProvider === EGraphicProvider.Selection) {
            setActiveGraphicProvider(EGraphicProvider.Selection);
            setSelectedGeometry(feature?.geometry);

        }
    }, [activeGraphicProvider]);

    if (props.state !== WidgetState.Opened) {
        return <></>;
    }

    /**
     * - Přepnutí aktivního druhu získání geometrie {@link activeGraphicProvider} na hodnotu {@link EGraphicProvider.Graphic}.
     * - Změna hodnoty geometrie jejíž souřadnice zobrazujeme {@link selectedGeometry} podle vykreslené geometrie nástrojem {@link DrawGeometry}.
     */
    function selectDrawGeometry() {
        setSelectedGeometry(drawGeometryRef.current?.getGeometry());
        setActiveGraphicProvider(EGraphicProvider.Graphic);
    }

    /**
     * - Přepnutí aktivního druhu získání geometrie {@link activeGraphicProvider} na hodnotu {@link EGraphicProvider.Selection}.
     * - Změna hodnoty geometrie jejíž souřadnice zobrazujeme {@link selectedGeometry} podle vykreslené geometrie nástrojem {@link FeatureFromSelection}.
     */
    function selectFetureGeometry() {
        setSelectedGeometry(featureFromSelectionRef.current?.getSelectedFeature()?.geometry);
        setActiveGraphicProvider(EGraphicProvider.Selection);
    }

    return <Card className="widget-CoordinateConversion">
        <CardBody>
            <Radio
                id="coordinate-conversion-selection-radio"
                checked={activeGraphicProvider === EGraphicProvider.Selection}
                onClick={selectFetureGeometry}
            />
            <Label for="coordinate-conversion-selection-radio">
                {messageFormater("selectedGeometry")}
            </Label>
            
            <FeatureFromSelection
                onSelect={onFeatureFromSelectionSelect}
                ref={featureFromSelectionRef}
            />

            <Radio
                id="coordinate-conversion-draw-radio"
                checked={activeGraphicProvider === EGraphicProvider.Graphic}
                onClick={selectDrawGeometry}
            />
            <Label for="coordinate-conversion-draw-radio">
                {messageFormater("drawedGeomteryLabel")}
            </Label>

            <DrawGeometry
                ref={drawGeometryRef}
                canDraw={activeGraphicProvider === EGraphicProvider.Graphic}
                onDraw={selectDrawGeometry}
                onGeometryChange={selectDrawGeometry}
            />
            
            <DisplayVertexes
                geometry={selectedGeometry}
            />

        </CardBody>
    </Card>;
}
  
export default WidgetWrapper(Widget, { hasAssets: true, ignoreJimuMapView: false, lazy: true });

/** - Typy získání geometrie jejiž souřadnice budeme převádět. */
enum EGraphicProvider {
    /** - Z prvku ve výběru. */
    Selection,
    /** - Zakreslení geometrie. */
    Graphic
};
