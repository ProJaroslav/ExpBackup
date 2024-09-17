import { JimuMapView } from "jimu-arcgis";
import { DbRegistryLoader, LayerDefinitionHelper, LayerHelper, FeatureHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, EFeatureType, ELoadStatus } from "widgets/shared-code/enums";

/**
 * - Třída se základními metodami pro filtraci doménových hodnot {@link field pole} na základě hodnot {@link featur prvku}.
 * - Tato třída je určena k dědění, ne k přímému použití.
 */
export abstract class CodedValuesHandlerBase {
    /** - Signalizace přerušení aktivity této instance objektu. */
    protected readonly signal: AbortSignal;
    /** - Prvek podle jehož hodnot filtrujeme doménové hodnoty. */
    protected readonly feature: __esri.Graphic;
    /** - Pole ze zdrojové vrtvy {@link feature prvku}, jehož doménové hodnoty filtrijeme. */
    protected readonly field: __esri.Field;
    /** - Aktivní pohled mapy. */
    protected readonly jimuMapView: JimuMapView;
    /**
     * - Omezující atributy pro {@link field toto pole}.
     * - Podle hodnot těchto atributů se filtrují doménové hodnoty {@link field tohoto pole}.
     */
    protected dependAttributes: Array<string>;
    /** - Naslouchání na změnu hodnot {@link dependAttributes omezujících atributů} v {@link feature prvku}. */
    private listener: __esri.WatchHandle;
    /** - Kontroler, k poslední vyvolané {@link filter filtraci prvků}. */
    protected lastFilterAbortController: AbortController;
    /** - Komponenty, které se budou zobrazovat ve vrchní části číselníku pro výběr doméhové hodnoty {@link field pole}. */
    protected prefixElements: HSI.CodedValuesHandler.ICodedValuesState['prefixElements'];

    /**
     * - Třída se základními metodami pro filtraci doménových hodnot {@link field pole} na základě hodnot {@link featur prvku}.
     * - Tato třída je určena k dědění, ne k přímému použití.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param feature - Prvek podle jehož hodnot filtrujeme doménové hodnoty.
     * @param field - Pole ze zdrojové vrtvy {@link feature prvku}, jehož doménové hodnoty filtrijeme.
     * @param signal - Signalizace přerušení aktivity této instance objektu.
     */
    constructor(jimuMapView: JimuMapView, feature: __esri.Graphic, field: __esri.Field, signal: AbortSignal) {
        this.jimuMapView = jimuMapView;
        this.feature = feature;
        this.field = field;
        this.signal = signal;
    }

    /**
     * - Započne filtraci doménových hodnot.
     * - Pokaždé když se změní relevantní hodnota prvku, tak zavolá {@link callback} s novými doménovými hodnotami.
     * @param callback - Funkce, která se zavolá pokaždé, když dojde ke změně relevantní hodnoty prvku, a na vstupu přebírá vyfiltrované doménové hodnoty.
     */
    public async execute(callback: (codedValuesState: HSI.CodedValuesHandler.ICodedValuesState) => void) {
        try {
            callback({ loadStatus: ELoadStatus.Pending });
            if (await this.canFilter()) {
                await this.prepareFilterValues();
    
                if (!this.signal.aborted) {
                    if (Array.isArray(this.dependAttributes)) {
                        this.handleFilter(this.dependAttributes.map(this.feature.getAttribute.bind(this.feature)), callback);
                        this.destroy(); //Jen pro jistotu
                        this.setListener(callback);          
                    } else {
                        callback({ loadStatus: "no-filter" });
                    }
                }
            } else {
                callback({ loadStatus: "no-filter" });
            }
        } catch(error) {
            callback({
                error,
                loadStatus: ELoadStatus.Error
            });
        }
    }

    /** - Všechny (nevyfiltrované) doménové hodnoty z {@link field tohoto pole}. */
    public get codedValues(): Array<__esri.CodedValue> {
        if (this.field.domain.type === "coded-value") {
            return this.field.domain.codedValues;
        } else {
            throw new Error(`Unhandled domain type '${this.field.domain.type}'`);
        }
    }

    /**
     * - Odebrání {@link listener naslouchání} na změny hodnot {@link feature prvku}.
     * - Metoda {@link execute} už tedy nebude podkytovat vyfiltrované doménové hodnoty.
     */
    public destroy(): void {
        if (!!this.listener) {
            this.listener.remove();
        }
    }

    /**
     * - Nastavení naslouchání na změny, které vyvolají filtraci domén.
     * @param callback - Funkce, která se zavolá pokaždé, když dojde ke změně relevantní hodnoty prvku, a na vstupu přebírá vyfiltrované doménové hodnoty.
     */
    protected setListener(callback: (codedValuesState: HSI.CodedValuesHandler.ICodedValuesState) => void): void {
        if (this.dependAttributes.length > 0) {
            this.listener = FeatureHelper.watchAttributeChange(this.feature, this.dependAttributes, newValues => {
                if (this.signal.aborted) {
                    this.destroy();
                } else {
                    this.handleFilter(newValues, callback);
                }
            });
        }
    }

    /** - Načtení konfigurace vázaných číselníků pro zdrojovou vrstvu tohoto {@link feature prvku}. */
    protected async fetchConfiguration(): Promise<typeof dbConfiguration['mapServices'][number]['layers'][number]> {
        const dbConfiguration = await DbRegistryLoader.fetchDbRegistryValue(this.jimuMapView, { name: EDbRegistryKeys.ContingentValues, scope: "g", type: "json" }, this.signal);
        
        /** - Mapová služba ze které pochází {@link feature prvek}. */
        const mapImageLayer = LayerHelper.getMapImageLayerFromFeature(this.jimuMapView, this.feature);
        /** - Definice {@link mapImageLayer mapové služby} ze které pochází {@link feature prvek}. */
        const mapImageLayerDefinition = await LayerDefinitionHelper.getMapImageLayerDefinition(mapImageLayer);
        if (Array.isArray(dbConfiguration?.mapServices)) {
            for (let mapServiceDefinition of dbConfiguration.mapServices) {
                if (LayerDefinitionHelper.matchMapImageLayerDefinition(mapServiceDefinition, mapImageLayerDefinition) && Array.isArray(mapServiceDefinition?.layers)) {
                    for (let layerDefinition of mapServiceDefinition.layers) {
                        if (layerDefinition.layerId === this.layerId) {
                            return layerDefinition;
                        }
                    }
                }
            }
        }
    }

    /** - Poskytuje pole ve {@link layerId zdrojové vrstvě} {@link feature prvku}. */
    protected async findFields(): Promise<Array<__esri.Field>> {
        const sourceLayer = LayerHelper.getSourceLayerFromFeature(this.feature, true);

        if (!!sourceLayer) {
            if (sourceLayer.loadStatus !== "loaded") {
                await sourceLayer.load();
            }

            return sourceLayer.fields;
        }
    }

    /** - Může se pro {@link feature tento prvek} provést filtrace {@link codedValues doménových hodnot}? */
    protected abstract canFilter(): Promise<boolean>;

    /** - Zdrojová mapová služba {@link feature prvku}. */
    protected get mapImageLayer(): __esri.MapImageLayer {
        return LayerHelper.getMapImageLayerFromFeature(this.jimuMapView, this.feature);
    }

    /** - Identifikátor v rámci {@link mapImageLayer mapové služby}, pro zdrojovou vrstvu {@link feature prvku}. */
    protected get layerId(): number {
        return this.featureType === EFeatureType.Sublayer ? LayerHelper.getSublayerFromFeature(this.feature).id : LayerHelper.getTableFromFeature(this.feature).layerId;
    }

    /** - Typ zdrojové vrtsvy {@link feature prvku}. */
    protected get featureType(): EFeatureType {
        const featureType = FeatureHelper.getFeatureType(this.feature);

        if (![EFeatureType.Sublayer, EFeatureType.Table].includes(featureType)) {
            throw new Error(`Unhandled feature type '${featureType}`);
        }

        return featureType;
    }

    /** - Přichystání nezbytných hodnot pro započetí filtrace {@link codedValues doménových hodnot} pro {@link feature tento prvek}. */
    protected abstract prepareFilterValues(): Promise<void>;

    /**
     * - Filtrace {@link codedValues doménových hodnot} {@link feature tohoto prvku}.
     * - Vyvolá se pokaždé když se v {@link feature prvku} změní hodnota {@link dependAttributes omezujících atributů}.
     * @param values - Současné hodnoty {@link dependAttributes omezujících atributů} {@link feature tohoto prvku}.
     * @param signal - Signalizace přesušení filtrace.
     */
    protected abstract filter(values: Array<any>, signal: AbortSignal): Promise<Array<__esri.CodedValue>>;

    /**
     * - Vyvolání {@link filter funkce pro filtraci doménových hodnot}.
     * @param values - Současné hodnoty {@link dependAttributes omezujících atributů} {@link feature tohoto prvku}.
     * @param callback - Funkce, které se předávají vyfiltrované doménové hodnoty.
     */
    protected async handleFilter(values: Array<any>, callback: (codedValuesState: HSI.CodedValuesHandler.ICodedValuesState) => void) {
        if (!this.signal.aborted) {
            const abortController = new AbortController;
            try {
                if (!!this.lastFilterAbortController && !this.lastFilterAbortController.signal.aborted) {
                    this.lastFilterAbortController.abort();
                }
                this.lastFilterAbortController = abortController;
    
                callback({ loadStatus: ELoadStatus.Pending, prefixElements: this.prefixElements });
    
                const codedValues = await this.filter(values, abortController.signal);
    
                if (!abortController.signal.aborted && !this.signal.aborted) {
                    callback({ codedValues, loadStatus: ELoadStatus.Loaded, prefixElements: this.prefixElements });
                }

            } catch(error) {
                if (!abortController.signal.aborted && !this.signal.aborted) {
                    callback({ loadStatus: ELoadStatus.Error, error, prefixElements: this.prefixElements });
                }
            }
        }
    }

    /**
     * - Poskytuje pravý název {@link attributeName atributu} z {@link feature prvku}.
     * - Důvod řešení je ten, že se může stát, že se u joinovaných vstev liší názvy atributů ve vrstvě z MapServer a FeatureServer. Dokonce se může stát, že má {@link feature prvek} jiné atributy než jeho zdrojová vrstva.
     * @param attributeName - Název atributu, který se převede na alternativu z {@link feature prvku}.
     */
    protected async realAttributeName(attributeName: string): Promise<string> {
        let realAttributeName = attributeName;
        if (!(realAttributeName in this.feature.attributes)) {
            realAttributeName = Object.keys(this.feature.attributes).find(attribute => FeatureHelper.compareFieldName(realAttributeName, attribute)) || realAttributeName;
            if (!(realAttributeName in this.feature.attributes)) {
                const field = (await this.findFields()).find(f => FeatureHelper.compareFieldName(f, attributeName));

                if (!!field) {
                    realAttributeName = field.name;
                }
            }
        }

        return realAttributeName;
    }
}

export default CodedValuesHandlerBase;