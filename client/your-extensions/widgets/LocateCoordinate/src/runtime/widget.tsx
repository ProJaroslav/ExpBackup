import { React, AllWidgetProps } from "jimu-core";
import { Card, CardBody, Select, Option, Label, TextInput, CardFooter, Button, ButtonGroup } from "jimu-ui";
import { WidgetWrapper } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { EDbRegistryKeys } from "widgets/shared-code/enums";
import { ArcGISJSAPIModuleLoader, DbRegistryLoader, NotificationHelper, GeometryTransformer, GeometryHelper } from "widgets/shared-code/helpers";
import {useConfig, useMessageFormater} from "widgets/shared-code/hooks";
import translations from "./translations/default";
import { EStateChange, initializer, reducer } from "./helpers/widgetState";
import "./widget.scss";
/**
 * - Hlavní komponenta widgetu.
 * - @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/}.
 */
function Widget(props: AllWidgetProps<{}>) {
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Vrstva do které se zakresluje vyhledaná souřadnice. */
    const graphicLayerRef = React.useRef<__esri.GraphicsLayer>();
    const [state, dispatchState] = React.useReducer(reducer, null, initializer);
    const ArcGISJSAPIModuleLoaderRef = React.useRef(new ArcGISJSAPIModuleLoader(['Point', "Color", "geometryService", "Graphic"]));
    const config = useConfig<HSI.LocateCoordinateWidget.IMConfig>();
    
    /** - Načtění konfigurace widgetu. */
    React.useEffect(() => {
        const abortController = new AbortController();

        Promise.all([
            DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", name: EDbRegistryKeys.LocateSettings, scope: "g" }, abortController.signal),
            ArcGISJSAPIModuleLoader.getModule("SpatialReference")
        ])
            .then(([config, SpatialReference]) => {
                dispatchState({
                    type: EStateChange.SpatialReferenceList,
                    spatialReferences: config.spatialReferences.map(spatialReference => ({
                        spatialReference: new SpatialReference({ wkid: spatialReference.wkid }),
                        title: spatialReference.title,
                        conversionType: spatialReference.conversionType,
                        yFirst: spatialReference.yFirst,
                        examples: spatialReference.examples,
                        epocha: spatialReference.epocha,
                        alwaysNegative: spatialReference.alwaysNegative
                    }))
                });

                if (!!config.geometryServiceUrl) {
                    return config.geometryServiceUrl;
                }

                return GeometryHelper.getGeometryServiceUrl(jimuMapView)
            })
            .then(geometryServiceUrl => {
                if (!abortController.signal.aborted) {
                    dispatchState({ type: EStateChange.SetGeometryServiceUrl, geometryServiceUrl });
                }
            })
            .catch(err => {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    NotificationHelper.handleError(messageFormater("loadConfigFailed"), err);
                }
            });

        return abortController.abort;
    }, [jimuMapView]);

    /** - Načtení {@link graphicLayerRef}. */
    React.useEffect(() => {
        var isActive = true;

        ArcGISJSAPIModuleLoader.getModule("GraphicsLayer")
            .then(GraphicLayer => {
                if (isActive) {
                    graphicLayerRef.current = new GraphicLayer();
                    jimuMapView.view.map.add(graphicLayerRef.current);
                }
            })
            .catch(err => {
                console.warn(err);
            });

        return function() {
            isActive = false;
            if (graphicLayerRef.current && !graphicLayerRef.current.destroyed) {
                graphicLayerRef.current.destroy();
            }
        }
    }, [jimuMapView]);

    /** - Jsou splněny podmínky pro zobrazení zadané souřadnice? */
    const canLocate = !!state.selectedSpatialReference && !!state.coordinates;
    /** - Vybraný template souřadnicového systému. */
    const spatialReferenceTemplate = state.spatialReferences.find(spatialReferenceTemplate => spatialReferenceTemplate.spatialReference === state.selectedSpatialReference);

    /** - Přesun na zadané souřadnice. */
    async function locate() {
        try {
            if (!state.geometryServiceUrl) {
                props.dispatch(NotificationHelper.createAddNotificationAction({ type: "warning", message: messageFormater("geometryServiceIsNotSpecified") }));
            } else if (canLocate) {
                if (!ArcGISJSAPIModuleLoaderRef.current.isLoaded) {
                    await ArcGISJSAPIModuleLoaderRef.current.load();
                }

                let { coordinates } = state;

                if (typeof coordinates === "string") {
                    coordinates = coordinates.trim();
                    if (!coordinates.includes(" ") && coordinates.includes(",")) {
                        coordinates = coordinates.replace(",", ", ");
                    }
                }

                let point: __esri.Point;

                if (spatialReferenceTemplate.conversionType) {
                    const response = await ArcGISJSAPIModuleLoaderRef.current.getModule("geometryService").fromGeoCoordinateString(state.geometryServiceUrl, {
                        sr: state.selectedSpatialReference,
                        strings: [coordinates],
                        conversionType: spatialReferenceTemplate.conversionType
                    }) as [[number, number]];

                    if (response?.[0]?.[0] && response?.[0]?.[1]) {
                        point = new (ArcGISJSAPIModuleLoaderRef.current.getModule("Point"))({
                            spatialReference: state.selectedSpatialReference,
                            x: response[0][0],
                            y: response[0][1]
                        });
                    }
                } else {
                    const coordinatesArr = coordinates.split(" ");
    
                    point = new (ArcGISJSAPIModuleLoaderRef.current.getModule("Point"))({
                        spatialReference: state.selectedSpatialReference,
                        x: parseFloat(coordinatesArr[spatialReferenceTemplate.yFirst ? 1 : 0]),
                        y: parseFloat(coordinatesArr[spatialReferenceTemplate.yFirst ? 0 : 1])
                    });
                }

                if (!point || !point.x || !point.y) {
                    return props.dispatch(NotificationHelper.createAddNotificationAction({ type: "warning", message: messageFormater("unvalidCoordinateFormat") }));
                }

                if (spatialReferenceTemplate.alwaysNegative) {
                    if (typeof point.x === "number" && point.x > 0) {
                        point.x *= -1;
                    }
                    if (typeof point.y === "number" && point.y > 0) {
                        point.y *= -1;
                    }
                }

                const [newPoint, symbol] = await Promise.all([
                    new GeometryTransformer(point, {
                        geometryServiceUrl: state.geometryServiceUrl,
                        epocha: spatialReferenceTemplate.epocha,
                        jimuMapView
                    })[!config.forbidTransformGeometryByCuzk ? 'preciseTransformation' : 'project'](jimuMapView.view.spatialReference),
                    GeometryHelper.getSymbology("point", { color: new (ArcGISJSAPIModuleLoaderRef.current.getModule("Color"))([255, 0, 0, 1]) })
                ]);

                if (!newPoint) {
                    throw new Error(`Output geometry not found!`);
                }

                if (!newPoint.x || !newPoint.y) {
                    throw new Error(`Invalid output geometry: ${JSON.stringify(newPoint.toJSON())}`);
                }

                const graphics = new (ArcGISJSAPIModuleLoaderRef.current.getModule("Graphic"))({ symbol, geometry: newPoint })

                if (graphicLayerRef.current) {
                    graphicLayerRef.current.removeAll();
                    graphicLayerRef.current.add(graphics);
                }

                await GeometryHelper.zoom(jimuMapView, [graphics]);
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(messageFormater("locateFailed"), err);
        }
    }

    return <Card className="widget-LocateCoordinate">
        <CardBody>

            <Label for="spatialReferenceSelect">
                {messageFormater("selectSystemLabel")}
            </Label>

            <Select
                id="spatialReferenceSelect"
                size="sm"
                value={state.selectedSpatialReference?.wkid}
                onChange={ev => dispatchState({ type: EStateChange.SelectSpatialReference, wkid: ev.target.value })}
            >
                {
                    state.spatialReferences.map(spatialReference => {
                        return <Option
                            key={spatialReference.spatialReference.wkid}
                            value={spatialReference.spatialReference.wkid}
                        >
                            {spatialReference.title}
                        </Option>;
                    })
                }
            </Select>

            <Label for="coordinateSelect">
                {messageFormater("coordinatesLabel")}
            </Label>

            <TextInput
                id="coordinateSelect"
                size="sm"
                value={state.coordinates}
                onChange={ev => dispatchState({ type: EStateChange.SetCoordinates, coordinates: ev.target.value })}
            />
            {
                spatialReferenceTemplate?.examples?.map(example => {
                    return <p className="coordinate-example">{example}</p>
                })
            }
        </CardBody>
        <CardFooter>
            <ButtonGroup>
                <Button
                    onClick={locate}
                    disabled={!canLocate}
                >
                    {messageFormater("locateButton")}
                </Button>
                <Button
                    onClick={() => {
                        graphicLayerRef.current?.removeAll()
                        dispatchState({ type: EStateChange.SetCoordinates, coordinates: "" })
                    }}
                >
                    {messageFormater("clearButton")}
                </Button>
            </ButtonGroup>
        </CardFooter>
    </Card>;
}
  
export default WidgetWrapper(Widget, { ignoreJimuMapView: false, provideConfiguration: true });