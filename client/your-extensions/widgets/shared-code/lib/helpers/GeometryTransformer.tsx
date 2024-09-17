import { JimuMapView } from "jimu-arcgis";
import { EDbRegistryKeys, ECuzkCrs } from "widgets/shared-code/enums";
import { ArcGISJSAPIModuleLoader, DbRegistryLoader } from "widgets/shared-code/helpers";

/** - Třída umožňujicí transformaci souřadnic mezi souřadnicovými systémy.*/
export default class GeometryTransformer<G extends __esri.Multipoint | __esri.Point | __esri.Polygon | __esri.Polyline | __esri.Extent | __esri.Geometry> {
    //#region - Readonly vlastnosti.
    private static readonly _cuzkTransformationServiceUrl: string = "https://ags.cuzk.cz/arcgis2/rest/services/Transformacni/TransformaceSouradnic";
    /** - URL GeometryServeru. */
    private readonly _geometryServiceUrl: string;
    private readonly _geometry: G;
    /**
     * - Parametr "Epocha" předávaný do ČÚZK služby.
     * - Parametr se zadává v případě že je zvolen jako vstupní nebo výstupní CRS některý z WGS84 a nemá se použít aktuální datum. Požadovaný formát: dd.mm.rrrrr
     */
    private readonly _epocha: string;
    /**
     * - View mapy.
     * - Používá se pro dotažení {@link epocha epochy}.
     */
    private readonly _jimuMapView: JimuMapView;
    private readonly JSAPIModuleLoader = new ArcGISJSAPIModuleLoader(["Point", "Extent", "Multipoint", "Polygon", "Polyline", "geometryService", "ProjectParameters", "projection", "request", "DataFile", "geoprocessor"]);
    //#endregion

    constructor(geometry: G, options: IGeometryTransformerOptions = {}) {
        if (!!options?.geometryServiceUrl) {
            this._geometryServiceUrl = options.geometryServiceUrl;
        }

        if (!!options?.epocha) {
            this._epocha = options.epocha;
        }

        if (!!options?.jimuMapView) {
            this._jimuMapView = options.jimuMapView;
        }

        this._geometry = geometry;
    }

    //#region - ČÚZK služba pro transformaci souřadnic mezi SRS S-JTSK, ETRS89 a WGS84
    private _coordinates: ICoordinates;
    private get coordinates(): ICoordinates {
        if (!this._coordinates) {
            const geometry = this._geometry;
            switch (geometry.type) {
                case "polygon":
                    this._coordinates = (geometry as __esri.Polygon).rings.reduce<ICoordinates>((previousValue, currentValue) => {
                        return previousValue.concat(currentValue.map(([x, y, z]) => [x, y, z]));
                    }, []);
                    break;
                    
                case "polyline":
                    this._coordinates = (geometry as __esri.Polyline).paths.reduce<ICoordinates>((previousValue, currentValue) => {
                        return previousValue.concat(currentValue.map(([x, y, z]) => [x, y, z]));
                    }, []);
                    break;

                case "point":
                    const point = geometry as __esri.Point;
                    this._coordinates = [[point.x, point.y, point.z]];
                    break;

                case "extent":
                    const extent = geometry as __esri.Extent;
                    this._coordinates = [[extent.xmin, extent.ymin], [extent.xmin, extent.ymax], [extent.xmax, extent.ymax], [extent.xmax, extent.ymin]];
                    break;

                case "multipoint":
                    this._coordinates = (geometry as __esri.Multipoint).points.map(([x, y, z]) => [x, y, z]);
                    break;

                default:
                    throw new Error(`Unhandled geometry type '${geometry.type}'`);
            }

            this._coordinates = GeometryTransformer.modifyCoodinates(this._coordinates, this._geometry.spatialReference);
        }

        return this._coordinates;
    }

    private get inputCRS(): ECuzkCrs {
        return GeometryTransformer.getCrsName(this._geometry.spatialReference);
    }

    private static modifyCoodinates(coordinates: ICoordinates, spatialReference: __esri.SpatialReference): ICoordinates {
        const reverseCoordinates = spatialReference.isWGS84 || [].includes(spatialReference.wkid);
        const negateCoordinates = [5514, 102067].includes(spatialReference.wkid);

        if (reverseCoordinates) {
            coordinates = coordinates.map(([x, y, z]) => [y, x, z]);
        }

        if (negateCoordinates) {
            coordinates = coordinates.map(([x, y, z]) => [-1* x, -1* y, z]);
        }

        return coordinates;
    }
    
    /**
     * - Ověření zda je možno transformovat souřadnicový systém {@link spatialReference} pomocí ČÚZK služeb. 
     * - [Read more...](https://ags.cuzk.cz/arcgis2/rest/services/Transformacni/TransformaceSouradnic/GPServer/TransformaceSouradnic/)
     * @param spatialReference - Souřadnicový systém.
     */
    private static canBeTransformedByCuzk(spatialReference: __esri.SpatialReference): boolean {
        if (spatialReference.isWGS84) {
            return true;
        }

        return [
            32633, // WGS 84 / UTM zone 33N
            32634, // WGS 84 / UTM zone 34N
            3857, // WGS 84 / Pseudo-Mercator
            900913, // WGS 84 / Pseudo-Mercator
            102100, // WGS 84 / Pseudo-Mercator
            5514, // S-JTSK / Krovak
            2065, // S-JTSK / Krovak
            5513, // S-JTSK / Krovak East North
            102067, // S-JTSK / Krovak East North
            5221, // S-JTSK (Ferro) / Krovak East North	
            102066, // S-JTSK (Ferro) / Krovak East North	
            4258, // ETRS89 (geographic 2D)
            3045, // ETRS89 / TM33
            3046 // ETRS89 / TM34
        ].includes(spatialReference.wkid);
    }

    /**
     * - Poskytuje název souřadnicového referenčníhu systému {@link spatialReference} potřebného pro provolání ČÚZK služby {@link transformCoordinatesByCuzk}.
     * @param spatialReference - Souřadnicový systém.
     */
    private static getCrsName(spatialReference: __esri.SpatialReference): ECuzkCrs {
        if (!GeometryTransformer.canBeTransformedByCuzk(spatialReference)) {
            throw new Error(`Spatial reference wkid: ${spatialReference.wkid} can not be transformed by ČÚZK services.`);
        }

        if (spatialReference.isWGS84) {
            return ECuzkCrs.WGS84DEG;
        }

        switch(spatialReference.wkid) {
            case 32633:
                return ECuzkCrs.WGS84UTM33;
            case 32634:
                return ECuzkCrs.WGS84UTM34;
            case 3857:
            case 900913:
            case 102100:
                return ECuzkCrs.WGS84PseudoMercator;
            case 5514:
            case 5514:
            case 2065:
            case 102067:
            case 5221:
            case 102066:
                return ECuzkCrs.SJTSK;
            case 4258:
                return ECuzkCrs.WGS84DEG;
            case 3045:
                return ECuzkCrs.ETRS89TM33EVRS;
            case 3046:
                return ECuzkCrs.ETRS89TM34EVRS;
            default:
                throw new Error(`Unhandled spatial reference wkid: ${spatialReference.wkid}`);
        }
    } 

    public async transformGeometryByCuzk(outputSpatialReference: __esri.SpatialReference, signal?: AbortSignal): Promise<G> {
        if (outputSpatialReference.equals(this._geometry.spatialReference)) { 
            return this._geometry;
        }
        const transformedCoordinates = await this.transformGeometryByCuzkToCoordinates(outputSpatialReference, signal);
        return this.coordinatesToGeometry(transformedCoordinates, outputSpatialReference);
    }

    public async transformGeometryByCuzkToCoordinates(outputSpatialReference: __esri.SpatialReference, signal?: AbortSignal): Promise<ICoordinates> {
        if (outputSpatialReference.equals(this._geometry.spatialReference) || GeometryTransformer.getCrsName(outputSpatialReference) === GeometryTransformer.getCrsName(this._geometry.spatialReference)) {
            return GeometryTransformer.modifyCoodinates(this.coordinates, outputSpatialReference);
        }

        const transformedCoordinates = await this.cuzkTransform(GeometryTransformer.getCrsName(outputSpatialReference), signal);
        return GeometryTransformer.modifyCoodinates(transformedCoordinates, outputSpatialReference);
    }

    /**
     * - Poskytuje parametr "Epocha" předávaný do ČÚZK služby.
     * - Parametr se zadává v případě že je zvolen jako vstupní nebo výstupní CRS některý z WGS84 a nemá se použít aktuální datum. Požadovaný formát: dd.mm.rrrrr
     */
    private async fetchEpocha(): Promise<string> {
        if (typeof this._epocha === "string") {
            return this._epocha;
        }

        if (!!this._jimuMapView) {
            return DbRegistryLoader.fetchDbRegistryValue(this._jimuMapView, { name: EDbRegistryKeys.CuzkTransformationEpocha, scope: "g", type: "string" });
        }
    }

    private async coordinatesToGeometry(coordinates: ICoordinates, outputSpatialReference: __esri.SpatialReference): Promise<G> {
        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }
        switch (this._geometry.type) {
            case "extent":
                const Extent = this.JSAPIModuleLoader.getModule("Extent");
    
                return new Extent({
                    spatialReference: outputSpatialReference,
                    xmin: coordinates[0][0],
                    xmax: coordinates[2][0],
                    ymin: coordinates[0][1],
                    ymax: coordinates[1][1]
                }) as G;
            case "polygon":
                const Polygon = this.JSAPIModuleLoader.getModule("Polygon");
    
                return new Polygon({
                    spatialReference: outputSpatialReference,
                    rings: (this._geometry as __esri.Polygon).rings.map(ring => coordinates.splice(0, ring.length))
                }) as G;
                
            case "polyline":
                const Polyline = this.JSAPIModuleLoader.getModule("Polyline");
                
                return new Polyline({
                    spatialReference: outputSpatialReference,
                    paths: (this._geometry as __esri.Polyline).paths.map(path => coordinates.splice(0, path.length))
                }) as G;
            case "point":
                const Point = this.JSAPIModuleLoader.getModule("Point");
    
                return new Point({
                    x: coordinates[0][0],
                    y: coordinates[0][1],
                    spatialReference: outputSpatialReference
                }) as G;
            case "multipoint":
                const Multipoint = this.JSAPIModuleLoader.getModule("Multipoint");
                return new Multipoint({
                    spatialReference: outputSpatialReference,
                    points: coordinates
                }) as G;
            default:
                throw new Error(`Unhandled geometry type '${this._geometry.type}'`);
        }
    }

    private async cuzkTransform(outputCRS: ECuzkCrs, signal?: AbortSignal): Promise<ICoordinates> {
        var formdata = new FormData();
        formdata.append("file", new Blob(this.coordinates.map((coordinate, index) => `${index} ${coordinate[0]} ${coordinate[1]} ${coordinate[2] || 0}\n`), {type:"text/plain"}),"test.txt");
        formdata.append("f", "pjson");
    
        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }

        const request = this.JSAPIModuleLoader.getModule("request"),
            DataFile = this.JSAPIModuleLoader.getModule("DataFile"),
            geoprocessor = this.JSAPIModuleLoader.getModule("geoprocessor");
    
        const response = await request(`${GeometryTransformer._cuzkTransformationServiceUrl}/GPServer/uploads/upload`, {
            body: formdata,
            method: "post",
            responseType: "json",
            signal
        });
    
        const epocha = await this.fetchEpocha();
        const inputTXTfile = new DataFile();
        inputTXTfile.itemId = response.data.item.itemID;
    
        const params: ITransformaceSouradnicParams = { InputTXTfile: inputTXTfile, OutputCRS: outputCRS, InputCRS: this.inputCRS, Epocha: epocha };
    
        const jobInfo = await geoprocessor.submitJob(`${GeometryTransformer._cuzkTransformationServiceUrl}/GPServer/TransformaceSouradnic`, params, null, { signal });
    
        const results = await jobInfo.waitForJobCompletion({ interval: 1000, signal });
    
        if (results.jobStatus === "job-succeeded") {
            const result = await jobInfo.fetchResultData("URLResultTXT");
            
            if (typeof result.value !== "string") {
                throw new Error(`Result URL '${result.value}' is not a string`);
            }
            const value = await (await fetch(result.value, { signal })).text();
    
            const convertedCoordinates = value.split('\r').map(coordinate => coordinate.split("\t").map(item => parseFloat(item)));

            
            return this.coordinates.map<ICoordinates[0]>((coordinate, index) => {
                let convertedCoordinate = convertedCoordinates.find(([i]) => index === i);
                
                if (isNaN(convertedCoordinate[1]) || isNaN(convertedCoordinate[2])) {
                    throw new Error(`ČÚZK Coordinate transformation failed. Returned coordinates: ${value} `);
                }

                let convertedCoordinateResult: ICoordinates[0] = [convertedCoordinate[1], convertedCoordinate[2]] as any;
    
                if (coordinate.length === 3) {
                    convertedCoordinateResult.push(convertedCoordinate[3]);
                }
    
                return convertedCoordinateResult;
            });
        } else {
            throw new Error(`ČÚZK Coordinate transformation failed with job status: '${results.jobStatus}'`);
        }
    }

    //#endregion

    /**
     * - Převod geometrie na souřadnicový systém {@link outSpatialReference}. 
     * - Převod se uskutečňuje v GeometryServer {@link _geometryServiceUrl}
     * @param outSpatialReference - Souřadnicový systém na který checeme geometrii převést.
     * @param signal - Signalizace ukončení dotazu.
     */
    public async project(outSpatialReference: __esri.SpatialReference, signal?: AbortSignal): Promise<G> {
        if (!this._geometryServiceUrl) {
            throw new Error("Geometry service url is not defined!");
        }
        
        if (this._geometry.spatialReference.equals(outSpatialReference)) {
            return this._geometry;
        }

        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }

        const geometryService = this.JSAPIModuleLoader.getModule("geometryService");
        const ProjectParameters = this.JSAPIModuleLoader.getModule("ProjectParameters");

        const [geometry] = await geometryService.project(this._geometryServiceUrl, new ProjectParameters({
            geometries: [this._geometry],
            outSpatialReference
        }), { signal });

        return geometry as G;
    }

    /**
     * - Převod geometrie na souřadnicový systém {@link outputSpatialReference}.
     * - Převod se uskutečňuje na klientu.
     * @param outputSpatialReference - Souřadnicový systém na který checeme geometrii převést.
     */
    public async clientProject(outputSpatialReference: __esri.SpatialReference): Promise<G> {
        if (this._geometry.spatialReference.equals(outputSpatialReference)) {
            return this._geometry;
        }

        if (!this.JSAPIModuleLoader.isLoaded) {
            await this.JSAPIModuleLoader.load();
        }

        const projection = this.JSAPIModuleLoader.getModule("projection");

        if (!projection.isLoaded()) {
            await projection.load();
        }

        return projection.project(this._geometry, outputSpatialReference) as G;
    }

    /**
     * - Převod geometrie na souřadnicový systém {@link outputSpatialReference} nejpřesnějším možným způsobem.
     * - Pokud souřadnicové systémy jsou podporovány službou ČÚZK, použije se metoda {@link transformGeometryByCuzk}. Jinak se převod uskuteční v GeometryServer, popřípadě na klientu.
     * @param outputSpatialReference - Souřadnicový systém na který checeme geometrii převést.
     * @param signal - Signalizace ukončení dotazu.
     */
    public async preciseTransformation(outputSpatialReference: __esri.SpatialReference, signal?: AbortSignal): Promise<G> {
        if (GeometryTransformer.canBeTransformedByCuzk(this._geometry.spatialReference) && GeometryTransformer.canBeTransformedByCuzk(outputSpatialReference)) {
            return this.transformGeometryByCuzk(outputSpatialReference, signal);
        }

        if (!!this._geometryServiceUrl) {
            return this.project(outputSpatialReference, signal);
        }

        return this.clientProject(outputSpatialReference);
    }
}

type ICoordinates = Array<[number, number, number?]>;

interface IGeometryTransformerOptions {
    /** - URL GeometryServeru. */
    geometryServiceUrl?: string;
    /**
     * - Parametr "Epocha" předávaný do ČÚZK služby.
     * - Parametr se zadává v případě že je zvolen jako vstupní nebo výstupní CRS některý z WGS84 a nemá se použít aktuální datum. Požadovaný formát: dd.mm.rrrrr
     */
    epocha?: string;
    /**
     * - View mapy.
     * - Používá se pro dotažení {@link epocha epochy}.
     */
    jimuMapView?: JimuMapView;
}

interface ITransformaceSouradnicParams {
    InputCRS: ECuzkCrs;
    OutputCRS: ECuzkCrs;
    InputTXTfile: __esri.DataFile;
    Epocha?: string;
}