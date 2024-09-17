import { JimuMapView } from "jimu-arcgis";
import { loadArcGISJSAPIModules, loadArcGISJSAPIModule } from "jimu-core";
import { getTheme } from "jimu-theme";
import { ArcGISJSAPIModuleLoader, RequestHelper } from "widgets/shared-code/helpers";
import { GeometryType } from "@esri/arcgis-rest-types";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

export default class GeometryHelper {
    /**
     * - Poskytuje symbologii na základě typu geometrie featureSetu.
     * @param featureSet - FeatureSet obsahujicí typ geometrie.
     * @param params - Parametry symbologie.
     */
    public static getFeatureSetSymbology(featureSet: __esri.FeatureSet, params?: IGetSymbologyParams): Promise<__esri.Symbol> {
        return GeometryHelper.getSymbology(featureSet.geometryType, params);
    }
    
    /**
     * - Poskytuje symbologii na základě typu geometrie.
     * @param geometryType - Typ geometrie.
     * @param params - Parametry symbologie.
     */
    public static async getSymbology(geometryType: "point" | "multipoint", params?: IGetSymbologyParams): Promise<__esri.SimpleMarkerSymbol>;
    public static async getSymbology(geometryType: "polygon" | "extent", params?: IGetSymbologyParams): Promise<__esri.SimpleFillSymbol>;
    public static async getSymbology(geometryType: "polyline", params?: IGetSymbologyParams): Promise<__esri.SimpleLineSymbol>;
    public static async getSymbology(geometryType: HSI.IGeometryType, params?: IGetSymbologyParams): Promise<__esri.Symbol>;
    public static async getSymbology(geometryType: HSI.IGeometryType, params: IGetSymbologyParams = {}): Promise<__esri.Symbol> {
        const JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(['SimpleFillSymbol', "SimpleLineSymbol", "SimpleMarkerSymbol"]);
        await JSAPIModuleLoader.load();
        return GeometryHelper.getSymbologySync(
            geometryType,
            {
                SimpleFillSymbol: JSAPIModuleLoader.getModule("SimpleFillSymbol"),
                SimpleLineSymbol: JSAPIModuleLoader.getModule("SimpleLineSymbol"),
                SimpleMarkerSymbol: JSAPIModuleLoader.getModule("SimpleMarkerSymbol")
            },
            params
        );
    }
    
    /**
     * - Poskytuje symbologii na základě typu geometrie.
     * @param geometryType - Typ geometrie.
     * @param constructores - Moduly pro vytvoření symbologie.
     * @param params - Parametry symbologie.
     */
    public static getSymbologySync(geometryType: "point" | "multipoint", constructores: ISymbologyConstructores, params?: IGetSymbologyParams): __esri.SimpleMarkerSymbol;
    public static getSymbologySync(geometryType: "polygon" | "extent", constructores: ISymbologyConstructores, params?: IGetSymbologyParams): __esri.SimpleFillSymbol;
    public static getSymbologySync(geometryType: "polyline", constructores: ISymbologyConstructores, params?: IGetSymbologyParams): __esri.SimpleLineSymbol;
    public static getSymbologySync(geometryType: HSI.IGeometryType, constructores: ISymbologyConstructores, params?: IGetSymbologyParams): __esri.Symbol;
    public static getSymbologySync(geometryType: HSI.IGeometryType, constructores: ISymbologyConstructores, params: IGetSymbologyParams = {}): __esri.Symbol {
        let fillColor = params.fillColor || params.color?.clone();
        let lineColor = params.lineColor || params.color?.clone();
        let pointColor = params.pointColor || params.color?.clone();
    
        if (fillColor && params.fillOpacity) {
            fillColor.a = params.fillOpacity
        }
    
        if (lineColor && params.lineOpacity) {
            lineColor.a = params.lineOpacity
        }
    
        if (pointColor && params.pointOpacity) {
            pointColor.a = params.pointOpacity
        }
    
        const lineSymbol = new constructores.SimpleLineSymbol({
            cap: "round",
            color: lineColor,
            join: "round",
            style: params.lineStyle || "solid",
            width: params.lineWidth || 4
        });
    
        switch(geometryType) {
            case "extent":
            case "polygon":
                return new constructores.SimpleFillSymbol({
                    color: fillColor,
                    style: "solid",
                    outline: lineSymbol
                });
    
            case "multipoint":
            case "point":
                return new constructores.SimpleMarkerSymbol({
                    color: pointColor,
                    size: params.pointSize || 10,
                    style: "circle",
                    outline: lineSymbol
                });
    
            case "polyline":
                return lineSymbol;
    
            default:
                throw new Error(`Unhandled geometry type '${geometryType}'`);
        }
    }
    
    /**
     * - Přiblížení se na prvky.
     * @param jimuMapView - JimuMapView mapy ze které prvky pochází.
     * @param features - Prvky na které se chceme přiblížit.
     * @param expand - Zvětšení výsledného rozsahu.
     */
    public static zoom(jimuMapView: JimuMapView, features: Array<__esri.Geometry | __esri.Graphic> | __esri.Collection<__esri.Geometry | __esri.Graphic>, expand: number = 1.2): Promise<void> {
        return GeometryHelper.zoomView(jimuMapView.view, features, expand);
    }
    
    /**
     * - Přiblížení se na prvky.
     * @param jimuMapView - JimuMapView mapy ze které prvky pochází.
     * @param features - Prvky na které se chceme přiblížit.
     * @param expand - Zvětšení výsledného rozsahu.
     */
    public static async zoomView(view: __esri.MapView | __esri.SceneView, features: Array<__esri.Geometry | __esri.Graphic> | __esri.Collection<__esri.Geometry | __esri.Graphic>, expand: number = 1.2): Promise<void> {
        const extent = await GeometryHelper.getFullExtent(features, view.spatialReference);
        if (extent) {
            if (extent.xmax === extent.xmin && extent.ymax === extent.ymin) {
                view.goTo({
                    center: extent.center,
                    scale: Math.min(250, view.scale)
                });
            } else {
                view.goTo(extent.clone().expand(expand));
            }
        }
    }
    
    /**
     * - Posunutí do středu geometrie prvků.
     * @param jimuMapView - JimuMapView mapy ze které prvky pochází.
     * @param features - Prvky na které se chceme posunout.
     */
    public static async pan(jimuMapView: JimuMapView, features: Array<__esri.Geometry | __esri.Graphic> | __esri.Collection<__esri.Geometry | __esri.Graphic>) {
        const extent = await GeometryHelper.getFullExtent(features);
        if (extent)
            jimuMapView.view.goTo(extent.center);
    }
    
    /**
     * - Poskytuje celkový mapový rozsah geometrií (včetně bodů).
     * @param geometriesOrGraphics - Kolekce geometrií, nebo graphics u kterých zjišťujeme extent.
     * @param spatialReference - Preferovaný souřadnicový systém.
     */
    public static async getFullExtent(geometriesOrGraphics: (__esri.Geometry | __esri.Graphic)[] | __esri.Collection<__esri.Geometry | __esri.Graphic>, spatialReference?: __esri.SpatialReference): Promise<__esri.Extent> {
        // Pokud má parametr "getItemAt", je to esri kolekce.
        if (geometriesOrGraphics['getItemAt'])
            return GeometryHelper.getFullExtent((geometriesOrGraphics as __esri.Collection<__esri.Geometry | __esri.Graphic>).toArray(), spatialReference);
    
        if (!Array.isArray(geometriesOrGraphics))
            throw "The parameter is not an array nor a collection";
    
        // Pokud má parametr "geometry", je to Graphic.
        const geometries: __esri.Geometry[] = geometriesOrGraphics.map(geometryOrGraphic => geometryOrGraphic["geometry"] || geometryOrGraphic);
    
        var maxExtent: __esri.Extent;
    
        for (let geometry of geometries) {
            let extent = await GeometryHelper.getExtent(geometry);
            if (!extent)
                continue;
    
            if (!maxExtent) {
                if (spatialReference)
                    maxExtent = await project(extent, spatialReference);
                else
                    maxExtent = extent;
            } else {
                extent = await project(extent, maxExtent.spatialReference);
                maxExtent = maxExtent.union(extent);
            }
        }
        
        return maxExtent;
    }
    
    /**
     * - Poskytuje rozsah geometrie (v připadě bodu rozsah vytvoří).
     * @param geometry - Geometrie jejíž rozsah chceme získat.
     */
    public static async getExtent(geometry: __esri.Geometry): Promise<__esri.Extent> {
        if (!geometry)
            return null;
    
        if (geometry.extent)
            return geometry.extent.clone();
        
        let { x, y, spatialReference } = geometry as __esri.Point;
        if (!x || !y)
            return null;
    
        const Extent = await getExtentModule();
        return new Extent({ spatialReference, xmax: x, xmin: x, ymax: y, ymin: y });
    } 
    
    /** - Poskytuje URL geometrické služby. */
    public static async getGeometryServiceUrl(jimuMapView: JimuMapView): Promise<string> {
        let geometryServiceUrl = await RequestHelper.getDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.GeometryServiceUrl, scope: "g", type: "string" });
    
        if (!geometryServiceUrl) {
            const config = await loadArcGISJSAPIModule("esri/config") as __esri.config
    
            geometryServiceUrl = config.geometryServiceUrl;
        }
    
        return geometryServiceUrl;
    }
    
    /**
     * - Převod barvy tématu do formátu HEX.
     * @param color - CSS proměnná s barvou tématu.
     * @example getColor("var(--primary)") => "#484848"
     * @example getColor("var(--primary-200)") => "#ff94a1"
     * @example getColor("rgba(0,0,0,0.15)") => "rgba(0,0,0,0.15)"
     */
    public static getColor(color: string): string {
        const theme = getTheme();
        try {
            if (!color) {
                return theme.colors?.primary;
            } else if (color.includes("var(--")) {
                const [themeColor,themeColorValue ] = color.replace("var(--", "").replace(")", "").split("-");
                if (!themeColorValue) {
                    return theme.colors[themeColor];
                }
    
                return theme.colors.getPalette()[themeColor][themeColorValue];
            }
    
            return color;
        } catch(err) {
            console.warn(err);
            return theme.colors?.primary;
        }
    }
    
    public static getGeometryType(geometry: __esri.Geometry): GeometryType {
        switch(geometry?.type) {
            case "extent":
                return "esriGeometryEnvelope";
            case "multipoint":
                return "esriGeometryMultipoint";
            case "point":
                return "esriGeometryPoint";
            case "polygon":
                return "esriGeometryPolygon";
            case "polyline":
                return "esriGeometryPolyline";
            default:
                throw new Error(`Unhandled geometry type: ${geometry?.type}`);
        }
    }
};

interface IGetSymbologyParams {
    /** - Barva výplňového symbolu. */
    fillColor?: __esri.Color;
    /** - Barva symbolu linie. */
    lineColor?: __esri.Color;
    /** - Barva symbolu bodu. */
    pointColor?: __esri.Color;
    /** - Společná barva symbolů. */
    color?: __esri.Color;
    /** - Transparentnost výplňového symbolu. */
    fillOpacity?: number;
    /** - Transparentnost symbolu linie. */
    lineOpacity?: number;
    /** - Transparentnost symbolu bodu. */
    pointOpacity?: number;
    /** - Velikost symbolu bodu. */
    pointSize?: number;
    /** - Šířka symbolu linie. */
    lineWidth?: number;
    /** - Styl linie. */
    lineStyle?: __esri.SimpleLineSymbolProperties['style']
}
    
export interface ISymbologyConstructores {
    SimpleFillSymbol: typeof __esri.SimpleFillSymbol;
    SimpleLineSymbol: typeof __esri.SimpleLineSymbol;
    SimpleMarkerSymbol: typeof __esri.SimpleMarkerSymbol
};

//#region - Deprecated

/**
 * - Převod geometrie do požadovaného souřadnicového systému.
 * @deprecated Use {@link GeometryTransformer}
 * @param geometry - Geometrie, kterou chceme převést.
 * @param spatialReference - Souřadnicový systém, do kterého chceme geometrii převést.
 */
export async function project<T extends __esri.Point | __esri.Polygon | __esri.Polyline | __esri.Extent | __esri.Geometry>(geometry: T, spatialReference: __esri.SpatialReference): Promise<T>;
/**
 * - Převod geometrie do požadovaného souřadnicového systému.
 * @deprecated Use {@link GeometryTransformer}
 * @param geometry - Geometrie, kterou chceme převést.
 * @param wkid - Wkic Souřadnicového systému, do kterého chceme geometrii převést. {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-SpatialReference.html#wkid}
 */
export async function project<T extends __esri.Point | __esri.Polygon | __esri.Polyline | __esri.Extent | __esri.Geometry>(geometry: T, wkid: number): Promise<T>;
/**
 * - Převod geometrie do požadovaného souřadnicového systému.
 * @deprecated Use {@link GeometryTransformer}
 * @param geometry - Geometrie, kterou chceme převést.
 * @param spatialReferenceOrWkid - Souřadnicový systém, do kterého chceme geometrii převést, nebo jeho wkid.
 */
export async function project<T extends __esri.Point | __esri.Polygon | __esri.Polyline | __esri.Extent | __esri.Geometry>(geometry: T, spatialReferenceOrWkid: __esri.SpatialReference | number): Promise<T> {
    let spatialReference: __esri.SpatialReference;
    if (typeof spatialReferenceOrWkid === "number") {
        const SpatialReference = await getSpatialReferenceModule();
        spatialReference = new SpatialReference({ wkid: spatialReferenceOrWkid });
    } else {
        spatialReference = spatialReferenceOrWkid;
    }

    if (geometry.spatialReference.equals(spatialReference))
        return geometry;

    const projection = await loadArcGISJSAPIModule("esri/geometry/projection") as __esri.projection;

    if (!projection.isLoaded())
        await projection.load();

    return projection.project(geometry, spatialReference) as T;
}

/**
 * - Poskytuje moduly pro vytvoření symbologie.
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export async function getSymbologyModules() {
    const [
        SimpleFillSymbol,
        SimpleLineSymbol,
        SimpleMarkerSymbol,
        TextSymbol
    ] = await loadArcGISJSAPIModules([
        "esri/symbols/SimpleFillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/TextSymbol"
    ]) as [
        typeof __esri.SimpleFillSymbol,
        typeof __esri.SimpleLineSymbol,
        typeof __esri.SimpleMarkerSymbol,
        typeof __esri.TextSymbol
    ];

    return {
        SimpleFillSymbol,
        SimpleLineSymbol,
        SimpleMarkerSymbol,
        TextSymbol
    };
}

/**
 * - Poskytuje modul pro vytvoření grafické vrstvy.
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export async function getGraphicLayerModule() {
    const [GraphicsLayer] = await loadArcGISJSAPIModules(["esri/layers/GraphicsLayer"]) as [typeof __esri.GraphicsLayer];
    return GraphicsLayer;
}

/**
 * - Poskytuje modul pro vytvoření Graphics.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-Graphic.html}
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getGraphicsModule(): Promise<typeof __esri.Graphic> {
    return loadArcGISJSAPIModule("esri/Graphic");
}

/**
 * - Poskytuje modul pro vytvoření barvy.
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export async function getColorModule() {
    const [Color] = await loadArcGISJSAPIModules(["esri/Color"]) as [typeof __esri.Color];
    return Color;
}

/**
 * - Poskytuje modul pro vytvoření polygonu.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-Polygon.html}
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export async function getPolygonModule(): Promise<typeof __esri.Polygon> {
    const [Polygon] = await loadArcGISJSAPIModules(["esri/geometry/Polygon"]);
    return Polygon;
}

/**
 * - Poskytuje modul pro vytvoření bodu.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-Point.html}
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getPointModule(): Promise<typeof __esri.Point> {
    return loadArcGISJSAPIModule("esri/geometry/Point");
}

/**
 * - Poskytuje modul pro vytvoření možiny bodů.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-Multipoint.html}
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getMultipointModule(): Promise<typeof __esri.Multipoint> {
    return loadArcGISJSAPIModule("esri/geometry/Multipoint");
}

/**
 * - Poskytuje modul pro vytvoření linie.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-Polyline.html}
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getPolylineModule(): Promise<typeof __esri.Polyline> {
    return loadArcGISJSAPIModule("esri/geometry/Polyline");
}

/**
 * - Poskytuje nástroj pro práci s geometrií.
 * - [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-geometryEngineAsync.html)
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getGeometryEngine(): Promise<__esri.geometryEngineAsync> {
    return loadArcGISJSAPIModule("esri/geometry/geometryEngineAsync");
}

/**
 * - Poskytuje nástroj pro práci s geometrií.
 * - [Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-geometryEngine.html)
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getGeometryEngineSync(): Promise<__esri.geometryEngine> {
    return loadArcGISJSAPIModule("esri/geometry/geometryEngine");
}

/**
 * - Poskytuje modul pro vytvoření objektu souřadného systému.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-geometry-SpatialReference.html}
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export async function getSpatialReferenceModule(): Promise<typeof __esri.SpatialReference> {
    const [SpatialReference] = await loadArcGISJSAPIModules(["esri/geometry/SpatialReference"]) as [typeof __esri.SpatialReference];
    return SpatialReference;
}

/**
 * - Poskytuje modul pro vytvoření extentu.
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getExtentModule(): Promise<typeof __esri.Extent> {
    return loadArcGISJSAPIModule("esri/geometry/Extent");
}

/**
 * - Poskytuje geometryService.
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-rest-geometryService.html} 
 * @deprecated Use {@link ArcGISJSAPIModuleLoader}.
 */
export function getGeometryService(): Promise<__esri.geometryService> {
    return loadArcGISJSAPIModule("esri/rest/geometryService");
}
//#endregion