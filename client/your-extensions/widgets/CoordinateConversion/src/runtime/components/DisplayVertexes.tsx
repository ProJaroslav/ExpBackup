import { React } from "jimu-core";
import { TextArea, Select, Option, Label } from "jimu-ui";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ELoadStatus, EDbRegistryKeys } from "widgets/shared-code/enums";
import { RequestHelper, GeometryHelper, ArcGISJSAPIModuleLoader, GeometryTransformer, NotificationHelper, DbRegistryLoader } from "widgets/shared-code/helpers";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";

/** - Komponenta umožňuje výběr druhu převodu, podle něhož převádí souřadnice geometrie a zobratuje je v textovém poli. */
export default function(props: IDisplayVertexesProps) {
    /** - Převedoné souřadnice v textové podobě. */
    const [resutlString, setResultString] = React.useState<string>();
    /** - Stav převodu souřadnic {@link resutlString}. */
    const [loadingState, setLoadingState] = React.useState<ELoadStatus>();
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Konfigurace z DB registrů. */
    const [dbConfiguration, setDbConfiguration] = React.useState<HSI.DbRegistry.ICoordinateConversionDbValue>();
    /** - Zvolený druh převodu geometrie. */
    const [selectedConversion, selectConversion] = React.useState<HSI.DbRegistry.ICoordinateConversionDbValue['geometryConversion'][0]>();
    const messageFormater = useMessageFormater(translations);
    const JSAPIModuleLoaderRef = React.useRef(new ArcGISJSAPIModuleLoader(["geometryService", "SpatialReference"]));

    /** - Načtení konfigurace z DB registrů {@link dbConfiguration}. */
    React.useEffect(() => {
        const abortController = new AbortController();

        DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.CoordinateConversion, scope: "g", type: "json" }, abortController.signal)
            .then(dbConfig => {
                if (!dbConfig) {
                    NotificationHelper.addNotification({ message: messageFormater("dbValueNotSet"), type: "warning" });
                } else if (!Array.isArray(dbConfig.geometryConversion) || dbConfig.geometryConversion.length < 1) {
                    NotificationHelper.addNotification({ message: messageFormater("dbValueConversionsNotSet"), type: "warning" });
                } else {
                    setDbConfiguration(dbConfig);
                    selectConversion(dbConfig.geometryConversion[0]);
                }
            })
            .catch(err => {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    NotificationHelper.addNotification({ message: messageFormater("loadDbValuesFailed"), type: "error" });
                }
            });

        return function() {
            abortController.abort();
        }
    }, [jimuMapView]);
   
    /** - Převod souřadnic ze zvolené geometrie {@link props.geometry} podle zvoleného druhu převodu {@link selectedConversion} do textové podoby {@link resutlString}. */
    React.useEffect(() => {
        setResultString("");
        if (!props.geometry || !selectedConversion) {
            setLoadingState(ELoadStatus.Loaded);
            return;
        }

        const abortController = new AbortController();
        setLoadingState(ELoadStatus.Pending);

        (async function(): Promise<void> {
            let coordinateString: string;
            try {
                if (!JSAPIModuleLoaderRef.current.isLoaded) {
                    await JSAPIModuleLoaderRef.current.load();
                }
                const geometryServiceUrl = dbConfiguration.geometryServiceUrl || await GeometryHelper.getGeometryServiceUrl(jimuMapView);
                const geometryTransformer = new GeometryTransformer(props.geometry, { geometryServiceUrl, jimuMapView });

                switch(selectedConversion.type) {
                    case "convert":
                        let spatialReference = !selectedConversion.spatialReference ? props.geometry.spatialReference : new (JSAPIModuleLoaderRef.current.getModule("SpatialReference"))(selectedConversion.spatialReference);
                        const params: __esri.geometryServiceToGeoCoordinateStringParams = {
                            sr: spatialReference,
                            conversionType: selectedConversion.conversionType,
                            addSpaces: selectedConversion.addSpaces,
                            conversionMode: selectedConversion.conversionMode,
                            numOfDigits: selectedConversion.numOfDigits,
                            rounding: selectedConversion.rounding,
                            coordinates: await geometryTransformer.transformGeometryByCuzkToCoordinates(spatialReference)
                        };

                        params.coordinates = params.coordinates.map(([x, y]) => [x, y]); //Odebrání z souřadnice
        
                        let geoCoordinateStrings = await JSAPIModuleLoaderRef.current.getModule("geometryService").toGeoCoordinateString(geometryServiceUrl, params);
                        //#region - Přidání znaků stupňů a minut
                        if (selectedConversion.conversionType === "dms") {
                            geoCoordinateStrings = geoCoordinateStrings.map(geoCoordinateString => {
                                return geoCoordinateString.split(" ").reduce((previousValue, currentValue, index) => {
                                    let i = index % 3;
                                    return `${previousValue}${i === 1 ? "°" : i === 2 ? "′" : " "}${currentValue}`
                                }, "");
                            });
                        }
                        //#endregion
                        coordinateString = geoCoordinateStrings.join(";\n");
                        break;

                    case "project":
                        const projectedGeometry = await geometryTransformer.project(new (JSAPIModuleLoaderRef.current.getModule("SpatialReference"))(selectedConversion.spatialReference));
                        let coordinates: Array<Array<Array<number>>>; 

                        switch (projectedGeometry.type) {
                            case "polygon":
                                coordinates = (projectedGeometry as __esri.Polygon).rings;
                                break;
                            case "polyline":
                                coordinates = (projectedGeometry as __esri.Polyline).paths;
                                break;
                            case "point":
                                coordinates = [[[(projectedGeometry as __esri.Point).x, (projectedGeometry as __esri.Point).y]]];
                                break;
                            default:
                                throw new Error(`Unhandled geometry type '${props.geometry.type}'`);
                        }

                        const round = (num: number): string => {
                            return !selectedConversion.numOfDigits || typeof selectedConversion.numOfDigits !== "number" ? num?.toString() : num?.toFixed(selectedConversion.numOfDigits);
                        }

                        coordinateString = coordinates.map(ring => ring.map(([x, y]) => [round(x), round(y)].join(" ")).join(";\n")).join(";\n");

                        break;

                    case "cuzk":
                        const convertedCoordinates = await new GeometryTransformer(props.geometry, { jimuMapView }).transformGeometryByCuzkToCoordinates(new (JSAPIModuleLoaderRef.current.getModule("SpatialReference"))(selectedConversion.spatialReference), abortController.signal);

                        coordinateString = convertedCoordinates.map(([x, y]) => `${x} ${y}`).join(";\n");

                        break;
                    default:
                        throw new Error(`Unhandled conversion type '${selectedConversion['type']}'`);
                        break;
                }

                if (!abortController.signal.aborted) {
                    setResultString(coordinateString);
                    setLoadingState(ELoadStatus.Loaded);
                }
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setLoadingState(ELoadStatus.Error);
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [props.geometry, dbConfiguration?.geometryServiceUrl, selectedConversion, jimuMapView]);

    return <>
        <Label for="coordinate-conversion-select-conversion" className="coordinate-conversion-select-conversion-label">
            {messageFormater("formatLabel")}
        </Label>
        <Select
            id="coordinate-conversion-select-conversion"
            size="sm"
            value={selectedConversion ? dbConfiguration?.geometryConversion?.indexOf(selectedConversion) : null}
            onChange={ev => {
                selectConversion(dbConfiguration?.geometryConversion?.[parseInt(ev.target.value)]);
            }}
        >
            {
                dbConfiguration?.geometryConversion?.map((conversion, index) => {
                    return <Option
                        key={index}
                        value={index}
                    >
                        {conversion.title}
                    </Option>;
                })
            }
        </Select>

        <TextArea
            className="result-area"
            readOnly
            value={loadingState === ELoadStatus.Error ? messageFormater("failedToConvert") : resutlString}
        />
    </>;
}

interface IDisplayVertexesProps {
    /** - Geometrie jejíž souřadnice chceme zobrazit. */
    geometry: __esri.Geometry;
}