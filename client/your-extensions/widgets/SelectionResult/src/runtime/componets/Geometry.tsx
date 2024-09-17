import { React } from "jimu-core";
import { Card, CardBody, Select, Option, Label, CardFooter } from "jimu-ui";
import translations from "../translations/default";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { Table } from "widgets/shared-code/components";
import { GeometryTransformer, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import GeomteryEditor from "./GeomteryEditor";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";
const ModuleLoader = new ArcGISJSAPIModuleLoader(["SpatialReference", "geometryEngineAsync"]);

/** - Zobrazení a editace souřadnic jednotlivých vertexů prvku. */
export default React.memo(function(props: IGeometryProps) {
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);
    // Kopie prvku pro editaci, jehož geometrie je převedená do vybraného souřadného systému.
    const [graphic, setGraphic] = React.useState<__esri.Graphic>(() => props.feature.clone());
    // Souřadný systém ve kterém se geometrie zobrazuje.
    const [wkid, setWkid] = React.useState<number>(102067);
    // Obvod / Plocha geometrie vybraného prvku.
    const [geometrySum, setGeometrySum] = React.useState<React.ReactElement>(<span></span>);
    // Probíhá uládání změny geometrie?.
    const [isSaving, toggleSaving] = React.useState<boolean>(false);
    // Probíhá zjišťování editovatelnosti geometrie?.
    const [isLoadingEditability, toggleEditabilityLoading] = React.useState<boolean>(false);
    const editabilityConfiguration = React.useContext(LayerConfigurationContext);
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();

    // Při změně geometrie, nebo požadovaného souřadného systému, se geometrie převede do požadovaného souřadného systému.
    React.useEffect(() => {
        if (graphic.geometry.spatialReference.wkid === wkid) {
            return;
        }
        
        let isActive = true;

        const geometryTransformer = new GeometryTransformer(graphic.geometry);

        ModuleLoader
            .load()
            .then(() => {
                return geometryTransformer.preciseTransformation(new (ModuleLoader.getModule("SpatialReference"))({ wkid }))
            })
            .then(geo => {
                if (isActive) {
                    let copy = graphic.clone();
                    copy.geometry = geo;
                    setGraphic(copy);
                    graphic.destroy();
                }
            })
            .catch(err => {
                console.warn(err);
            });

        return () => {
            isActive = false;
        };
    }, [wkid, graphic]);

    // Při změně geometrie se přepočítá její obvod / plocha a uloží do state.
    React.useEffect(() => {
        let isActive = true;

        const sumGeometry = async () => {
            let span: React.ReactElement;
            try {
                if (!ModuleLoader.isLoaded) {
                    await ModuleLoader.load();
                }
                const geometryTransformer = new GeometryTransformer(graphic.geometry);
                const wgs84Geometry = await geometryTransformer.preciseTransformation(new (ModuleLoader.getModule("SpatialReference"))({ wkid: 4326 }));
    
                switch(wgs84Geometry.type) {
                    default:
                        console.warn(`Unhandled geometry type '${wgs84Geometry.type}'`)
                    case "point":
                    case "multipoint":
                        span = <span></span>;
                        break;
                    case "polygon":
                    case "extent":
                        const [area, length] = await Promise.all([
                            ModuleLoader.getModule("geometryEngineAsync").geodesicArea(wgs84Geometry as __esri.Polygon, "square-meters"),
                            ModuleLoader.getModule("geometryEngineAsync").geodesicLength(wgs84Geometry, "meters")
                        ]);
    
                        span = <span>{messageFormater("circuit")} {length.toFixed(2)}m {messageFormater("area")} {area.toFixed(2)}m<sup>2</sup></span>;
                        break;
    
                    case "polyline":
                        const distance = await ModuleLoader.getModule("geometryEngineAsync").geodesicLength(wgs84Geometry, "meters");
                        span = <span>{messageFormater("circuit")} {distance.toFixed(2)}m</span>;
                        break;
                }
            } catch(err) {
                console.warn(err);
                span = <span></span>;
            } finally {
                if (isActive) {
                    setGeometrySum(span);
                }
            }
        }

        sumGeometry();

        return () => {
            isActive = false;
        }
    }, [graphic, messageFormater]);

    //#region Obsah tabulky

    /** - Řádky v tabulce (vertexy). */
    let rows: HSI.Table.ITableRows;
    /** - Hlavičky v tabulce. */
    let header: HSI.Table.ITableHeader;
    const fixedDecimals = graphic.geometry.spatialReference.wkid === 102067 ? 2 : 6;

    switch(graphic.geometry.type) {
        case "point":
            let point = graphic.geometry as __esri.Point;
            header = [messageFormater("geometryXTitle"), messageFormater("geometryYTitle")]
            rows = [[point.x.toFixed(fixedDecimals), point.y.toFixed(fixedDecimals)]];
            break;

        case "multipoint":
            let multipoint = graphic.geometry as __esri.Multipoint;
            header = [messageFormater("geometryVertexTitle"), messageFormater("geometryXTitle"), messageFormater("geometryYTitle")];
            rows = multipoint.points.map(([x, y], index) => [index, x.toFixed(fixedDecimals), y.toFixed(fixedDecimals)]);
            break;
        case "polygon":
            let polygon = graphic.geometry as __esri.Polygon;
            header = [messageFormater("geometryVertexTitle"), messageFormater("geometryXTitle"), messageFormater("geometryYTitle")];
            rows = [].concat(...polygon.rings.map((ring, ringIndex) => ring.map(([x, y], index) => [polygon.rings.length > 1 ? `${ringIndex}-${index}` : index, x.toFixed(fixedDecimals), y.toFixed(fixedDecimals)])));
            break;
        case "polyline":
            let polyline = graphic.geometry as __esri.Polyline;
            header = [messageFormater("geometryVertexTitle"), messageFormater("geometryXTitle"), messageFormater("geometryYTitle")];
            rows = [].concat(...polyline.paths.map((path, pathIndex) => path.map(([x, y], index) => [polyline.paths.length > 1 ? `${pathIndex}-${index}` : index, x.toFixed(fixedDecimals), y.toFixed(fixedDecimals)])));
            break;
        case "extent":
            let extent = graphic.geometry as __esri.Extent;
            header = [messageFormater("geometryVertexTitle"), messageFormater("geometryXTitle"), messageFormater("geometryYTitle")];
            rows = [
                [0, extent.xmin.toFixed(fixedDecimals), extent.ymin.toFixed(fixedDecimals)],
                [1, extent.xmin.toFixed(fixedDecimals), extent.ymax.toFixed(fixedDecimals)],
                [2, extent.xmax.toFixed(fixedDecimals), extent.ymax.toFixed(fixedDecimals)],
                [3, extent.xmax.toFixed(fixedDecimals), extent.ymin.toFixed(fixedDecimals)],
                [4, extent.xmin.toFixed(fixedDecimals), extent.ymin.toFixed(fixedDecimals)]
            ];
            break;
        default:
            console.warn(`Unhandled geometry type '${props.feature.geometry.type}'`)
            break;
    }

    //#endregion

    return <Card className="tab-card">
        <CardBody className="geometry-wrapper">
            <Label className="spatial-reference-select-label">
                {messageFormater("spatialReferenceSelectLabel")}
                <Select
                    className="spatial-reference-select"
                    onChange={ev => setWkid(parseFloat(ev.target.value))}
                    value={wkid}
                    size="sm"
                >
                    <Option value={102067}>{messageFormater("sjtsk")}</Option>
                    <Option value={4326}>{messageFormater("wgs84")}</Option>
                </Select>
            </Label>
            <Table
                loading={isSaving || isLoadingEditability}
                header={header}
                rows={rows}
            />
            {geometrySum}
        </CardBody>
        {
            !config.forbidEditing && !!editabilityConfiguration && "allowGeometryUpdate" in editabilityConfiguration && editabilityConfiguration?.allowGeometryUpdate ? (
                <CardFooter>
                    <GeomteryEditor
                        isSaving={isSaving}
                        toggleSaving={toggleSaving}
                        geometryColor={props.geometryColor}
                        feature={props.feature}
                        graphic={graphic}
                        setGraphic={setGraphic}
                        isLoadingEditability={isLoadingEditability}
                        toggleEditabilityLoading={toggleEditabilityLoading}
                        pointSize={props.pointSize}
                    />
                </CardFooter>
            ) : <></>
        }
    </Card>;
});

interface IGeometryProps extends Pick<HSI.DbRegistry.IEditabilityDbValue, "geometryColor" | "pointSize"> {
    /** - Prvek označený ve stromové struktuře. */
    feature: __esri.Graphic;
};
