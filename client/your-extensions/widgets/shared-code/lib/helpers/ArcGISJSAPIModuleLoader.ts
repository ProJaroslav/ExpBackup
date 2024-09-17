import { loadArcGISJSAPIModules, loadArcGISJSAPIModule } from "jimu-core";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - Třída dymnamicky načítajicí moduly z ArcGIS API for JavaScript. */
export class ArcGISJSAPIModuleLoader<T extends Array<HSI.ArcGISJSAPIModuleLoader.IModuleName>> {
    /** - Názvy modulů, které chceme načíst. */
    private readonly _moduleNames: T;
    /** - Stav načtení modulů. */
    private _status: ELoadStatus;
    /** - Promisa načítajicí moduly. */
    private _loadModulesPromise: Promise<Array<any>>;
    /** - Načtěné moduly. */
    private _modules: Array<any>;

    /**
     * @param modules - Názvy modulů, které chceme načíst.
     * @param autoLoad - Chceme moduly načíst okamžitě po vytvoření objektu?
     */
    constructor(modules: T, autoLoad?: boolean) {
        this._moduleNames = Array.isArray(modules) ? modules : ([] as T);

        if (autoLoad) {
            this.load();
        }
    }

    /** - Stav načtení modulů. */
    public get status() {
        return this._status;
    }

    /** - Jsou moduly načteny? */
    public get isLoaded(): boolean {
        return this.status === ELoadStatus.Loaded;
    }

    /** - Načtění modulů definovaných v konstruktoru {@link _modules}. */
    public async load(): Promise<Array<any>> {
        try {
            if (this.isLoaded) {
                return this._modules;
            }

            if (this._status == ELoadStatus.Pending) {
                return this._loadModulesPromise;
            }
            this._status = ELoadStatus.Pending;
    
            this._loadModulesPromise = loadArcGISJSAPIModules(this._moduleNames.map(ArcGISJSAPIModuleLoader.getModulePath));

            this._modules = await this._loadModulesPromise;

            this._status = ELoadStatus.Loaded;

            delete this._loadModulesPromise;
        } catch(err) {
            console.warn(err);
            this._status = ELoadStatus.Error;
            throw err;
        }
    }

    /**
     * - Poskytuje modul podle jeho názvu.
     * - Název modulu musí být definován v konstruktoru!
     * @param moduleName - Název modulu.
     */
    public getModule<N extends typeof this._moduleNames[number]>(moduleName: N): HSI.ArcGISJSAPIModuleLoader.IModule<N> {
        const index = this._moduleNames.indexOf(moduleName);

        if (this._status !== ELoadStatus.Loaded) {
            throw new Error("Modules are not loaded yet!");
        }

        if (index === -1) {
            throw new Error(`Module ${moduleName} is not loaded!`);
        }

        return this._modules[index];
    }

    /**
     * - Poskytuje modul podle jeho názvu.
     * @param moduleName - Název modulu.
     */
    public static getModule<T extends HSI.ArcGISJSAPIModuleLoader.IModuleName>(moduleName: T): Promise<HSI.ArcGISJSAPIModuleLoader.IModule<T>> {
        return loadArcGISJSAPIModule(ArcGISJSAPIModuleLoader.getModulePath(moduleName));
    }

    /**
     * - Poskytuje cestu k modulu v ArcGIS API for JavaScript podle jeho názvu.
     * @param moduleName - Název modulu.
     */
    public static getModulePath(moduleName: HSI.ArcGISJSAPIModuleLoader.IModuleName): string {
        switch(moduleName) {
            case "Color":
                return "esri/Color";
            case "Graphic":
                return "esri/Graphic";
            case "Polygon":
                return "esri/geometry/Polygon";
            case "Point":
                return "esri/geometry/Point";
            case "Multipoint":
                return "esri/geometry/Multipoint";
            case "Polyline":
                return "esri/geometry/Polyline";
            case "geometryEngine":
                return "esri/geometry/geometryEngine";
            case "geometryEngineAsync":
                return "esri/geometry/geometryEngineAsync";
            case "SimpleFillSymbol":
                return "esri/symbols/SimpleFillSymbol";
            case "SimpleLineSymbol":
                return "esri/symbols/SimpleLineSymbol";
            case "SimpleMarkerSymbol":
                return "esri/symbols/SimpleMarkerSymbol";
            case "TextSymbol":
                return "esri/symbols/TextSymbol";
            case "GraphicsLayer":
                return "esri/layers/GraphicsLayer";
            case "SpatialReference":
                return "esri/geometry/SpatialReference";
            case "geometryService":
                return "esri/rest/geometryService";
            case "Extent":
                return "esri/geometry/Extent";
            case "request":
                return "esri/request";
            case "IdentityManager":
                return "esri/identity/IdentityManager";
            case "SketchViewModel":
                return "esri/widgets/Sketch/SketchViewModel";
            case "SnappingOptions":
                return "esri/views/interactive/snapping/SnappingOptions";
            case "FeatureSnappingLayerSource":
                return "esri/views/interactive/snapping/FeatureSnappingLayerSource";
            case "ButtonMenuItem":
                return "esri/widgets/FeatureTable/Grid/support/ButtonMenuItem";
            case "FeatureTable":
                return "esri/widgets/FeatureTable";
            case "config":
                return "esri/config";
            case "BufferParameters":
                return "esri/rest/support/BufferParameters";
            case "FeatureLayer":
                return "esri/layers/FeatureLayer";
            case "UniqueValueInfo":
                return "esri/renderers/support/UniqueValueInfo";
            case "PictureMarkerSymbol":
                return "esri/symbols/PictureMarkerSymbol";
            case "reactiveUtils":
                return "esri/core/reactiveUtils";
            case "SimpleRenderer":
                return "esri/renderers/SimpleRenderer";
            case "Search":
                return "esri/widgets/Search";
            case "LayerSearchSource":
                return "esri/widgets/Search/LayerSearchSource";
            case "LocatorSearchSource":
                return "esri/widgets/Search/LocatorSearchSource";
            case "FeatureTableViewModel":
                return "esri/widgets/FeatureTable/FeatureTableViewModel";
            case "ActionButton":
                return "esri/support/actions/ActionButton";
            case "ServerInfo":
                return "esri/identity/ServerInfo";
            case "OAuthInfo":
                return "esri/identity/OAuthInfo";
            case "Credential":
                return "esri/identity/Credential";
            case "BaseElevationLayer":
                return "esri/layers/BaseElevationLayer";
            case "ElevationLayer":
                return "esri/layers/ElevationLayer";
            case "CustomContent":
                return "esri/popup/content/CustomContent";
            case "ImageryLayer":
                return "esri/layers/ImageryLayer";
            case "Layer":
                return "esri/layers/Layer";
            case "RasterFunction":
                return "esri/layers/support/RasterFunction";
            case "Basemap":
                return "esri/Basemap";
            case "BasemapGallery":
                return "esri/widgets/BasemapGallery";
            case "MapImageLayer":
                return "esri/layers/MapImageLayer";
            case "TileLayer":
                return "esri/layers/TileLayer";
            case "ImageryTileLayer":
                return "esri/layers/ImageryTileLayer";
            case "WMSLayer":
                return "esri/layers/WMSLayer";
            case "WMTSLayer":
                return "esri/layers/WMTSLayer";
            case "print":
                return "esri/rest/print";
            case "Print":
                return "esri/widgets/Print";
            case "geoprocessor":
                return "esri/rest/geoprocessor";
            case "WebMap":
                return "esri/WebMap";
            case "MapView":
                return "esri/views/MapView";
            case "Compass":
                return "esri/widgets/Compass";
            case "Home":
                return "esri/widgets/Home";
            case "ScaleBar":
                return "esri/widgets/ScaleBar";
            case "AreaMeasurement2D":
                return "esri/widgets/AreaMeasurement2D";
            case "DistanceMeasurement2D":
                return "esri/widgets/DistanceMeasurement2D";
            case "AreaMeasurement2DViewModel":
                return "esri/widgets/AreaMeasurement2D/AreaMeasurement2DViewModel";
            case "DistanceMeasurement2DViewModel":
                return "esri/widgets/DistanceMeasurement2D/DistanceMeasurement2DViewModel";
            case "projection":
                return "esri/geometry/projection";
            case "Bookmarks":
                return "esri/widgets/Bookmarks";
            case "Viewpoint":
                return "esri/Viewpoint";
            case "Bookmark":
                return "esri/webmap/Bookmark";
            case "TileInfo":
                return "esri/layers/support/TileInfo";
            case "intl":
                return "esri/intl";
            case "FeatureSet":
                return "esri/rest/support/FeatureSet";
            case "ProjectParameters":
                return "esri/rest/support/ProjectParameters";
            case "DataFile":
                return "esri/rest/support/DataFile";
            case "GeoJSONLayer":
                return "esri/layers/GeoJSONLayer";
            case "Collection":
                return "esri/core/Collection";
            case "Field":
                return "esri/layers/support/Field";
            case "TableTemplate":
                return "esri/widgets/FeatureTable/support/TableTemplate";
            case "Attachments":
                return "esri/widgets/Attachments";
            case "FieldColumnTemplate":
                return "esri/widgets/FeatureTable/support/FieldColumnTemplate";
            case "Handles":
                return "esri/core/Handles";
            case "Portal":
                return "esri/portal/Portal";
            case "PortalGroup":
                return "esri/portal/PortalGroup";
            case "Map":
                return "esri/Map";
            case "symbolUtils":
                return "esri/symbols/support/symbolUtils";
            case "Sketch":
                return "esri/widgets/Sketch";
            default:
                console.warn(`Unhandled module name '${moduleName}'`);
        }
    }
}

export default ArcGISJSAPIModuleLoader;