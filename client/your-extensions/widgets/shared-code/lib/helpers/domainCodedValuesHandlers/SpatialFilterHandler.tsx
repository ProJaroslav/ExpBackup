import { JimuMapView } from "jimu-arcgis";
import { React } from "jimu-core";
import { Checkbox, NumericInput, Label } from "jimu-ui";
import { DbRegistryLoader, FloorHelper, FeatureHelper, LayerDefinitionHelper, LayerHelper } from "widgets/shared-code/helpers";
import CodedValuesHandlerBase from "./CodedValuesHandlerBase";
import { EDbRegistryKeys, EFeatureType, ELoadStatus } from "widgets/shared-code/enums";

/** - Třída pro filtraci doménových hodnot {@link field pole} na základě obalové zóny kolem {@link feature prvku}, která je definovaná v {@link EDbRegistryKeys.Editability konfiguraci DB registru}. */
export class ContingentValuesHandler extends CodedValuesHandlerBase {
    /** - Definice prostrorového dotazu, podle kterého lze filtrovat povolené hodnoty pro {@link field tento atribut}. */
    private spatialFilter: HSI.DbRegistry.IFieldEditabilityConfiguration['spatialFilter'];
    /** - Vrstva, ve které se prostorovým dotazem filtrují hodnoty {@link field attributu}. */
    private filterSublayer: __esri.Sublayer;
    /** - Poslední hodnoty state {@link SpatialFilterComponent komponenty pro určení oblasti filtace}. */
    private spatialFilterComponentState: ISpatialFilterComponentState;

    /**
     * - Třída pro filtraci doménových hodnot {@link field pole} na základě obalové zóny kolem {@link feature prvku}, která je definovaná v {@link EDbRegistryKeys.Editability konfiguraci DB registru}.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param feature - Prvek podle jehož hodnot filtrujeme doménové hodnoty.
     * @param field - Pole ze zdrojové vrtvy {@link feature prvku}, jehož doménové hodnoty filtrijeme.
     * @param signal - Signalizace přerušení aktivity této instance objektu.
     */
    constructor(jimuMapView: JimuMapView, feature: __esri.Graphic, field: __esri.Field, signal: AbortSignal) {
        super(jimuMapView, feature, field, signal);
    }

    protected override async canFilter(): Promise<boolean> {
        if (this.featureType !== EFeatureType.Sublayer) {
            return false;
        }
        
        if (FeatureHelper.getFeatureType(this.feature) === EFeatureType.Sublayer) {
            const [editabilityConfiguration, sourceLayerDefinition] = await Promise.all([
                DbRegistryLoader.fetchEditabilityDbRegistryValue(this.jimuMapView),
                LayerDefinitionHelper.getSublayerDefiniton(LayerHelper.getSublayerFromFeature(this.feature))
            ]);
    
            if (Array.isArray(editabilityConfiguration?.layerInfos)) {
                const layerInfo = editabilityConfiguration.layerInfos.find(layerInfo => LayerDefinitionHelper.matchMapImageLayerDefinition({ mapName: layerInfo.mapName, mapServiceName: layerInfo.serviceLayer }, sourceLayerDefinition));
    
                if (Array.isArray(layerInfo?.sublayerInfos)) {
                    const sublayerInfo = layerInfo.sublayerInfos.find(sublayerInfo => sublayerInfo.sublayerId === sourceLayerDefinition.layerId);
    
                    if (Array.isArray(sublayerInfo?.fieldInfos)) {
                        const fieldInfo = sublayerInfo.fieldInfos.find(fieldInfo => FeatureHelper.compareFieldName(fieldInfo.fieldName, this.field));

                        this.spatialFilter = fieldInfo?.spatialFilter;
                    }
                }
            }
        }

        return this.spatialFilter?.allowed;
    }

    protected override async prepareFilterValues(): Promise<void> {
        if (!this.spatialFilter.layer) {
            throw new Error(`Není definována vrstva, podle které se prostorovým dotazem, filtrují hodnoty attributu "${this.field.alias}"`);
        }

        if (!this.spatialFilter.layer.codeAttribute) {
            throw new Error(`Není definován atribut filtrační vrstvy, který odpovídá doménovým hodnotám  attributu "${this.field.alias}"`);
        }

        this.filterSublayer = await LayerDefinitionHelper.findSublayerByDefinition(this.jimuMapView, this.spatialFilter.layer);

        if (!this.filterSublayer) {
            throw new Error(`Nepodařilo se vyhledat vrstvu, podle které se prostorovým dotazem, filtrují hodnoty attributu "${this.field.alias}"`);
        }

        if (this.filterSublayer.loadStatus !== "loaded") {
            await this.filterSublayer.load();
        }

        if (!this.filterSublayer.fields.some(field => FeatureHelper.compareFieldName(field, this.spatialFilter.layer.codeAttribute))) {
            throw new Error(`Filtrační vrstva "${this.filterSublayer.title}" neobsahuje atribut "${this.spatialFilter.layer.codeAttribute}"`);
        }

        this.spatialFilterComponentState = {
            buffer: typeof this.spatialFilter.defaulBuffer === "number" ? Math.max(this.spatialFilter.defaulBuffer, 1) : 1,
            useBuffer: false
        };

        this.dependAttributes = [];
    }

    protected override setListener(callback: (codedValuesState: HSI.CodedValuesHandler.ICodedValuesState) => void): void {
        this.prefixElements = <SpatialFilterComponent
            lastState={this.spatialFilterComponentState}
            onStateChange={newState => {
                if (this.signal.aborted) {
                    this.destroy();
                } else {
                    this.spatialFilterComponentState.buffer = newState.buffer;
                    this.spatialFilterComponentState.useBuffer = newState.useBuffer;
                    this.handleFilter([], callback);
                }
            }}
        />;

        callback({
            loadStatus: ELoadStatus.Loaded,
            codedValues: this.codedValues,
            prefixElements: this.prefixElements
        });
    }

    /**
     * - Poskytuje where klauzuli pro prostorový filtr tak, aby se vyhledávali pouze prvky ve stejném podlaží v jakém je {@link feature prvek}.
     * - Where klauzule se vrací pouze v případě, že je to povoleno v {@link spatialFilter konfiguraci}, v aplikaci je widget na přepínání podlaží a obě vrstvy(zdrojová vrstva {@link feature prvku} a {@link filterSublayer filtrační vrstva}) jsou ovlivňovány podlažím.
     */
    private async getFloorWhereClause(): Promise<string> {
        if (this.spatialFilter.floor) {
            const filterFloorAttributeName = (await FloorHelper.getFloorSettings(this.jimuMapView, { parentMapImageLayer: await LayerDefinitionHelper.findMapImageLayerByDefinition(this.jimuMapView, this.spatialFilter.layer), sourceLayerId: this.spatialFilter.layer.layerId }))?.attribute;
            
            const filterFloorField = this.filterSublayer.fields.find(field => FeatureHelper.compareFieldName(field, filterFloorAttributeName));
            
            if (!!filterFloorField) {
                let floorAttribute = (await FloorHelper.getFloorSettings(this.jimuMapView, { parentMapImageLayer: this.mapImageLayer, sourceLayerId: this.layerId }))?.attribute;

                if (!!floorAttribute) {
                    floorAttribute = await this.realAttributeName(floorAttribute);

                    return FeatureHelper.getEqualCondition(filterFloorField.name, this.filterSublayer.fields, this.feature.getAttribute(floorAttribute));
                }
            }
        }
    }

    protected override async filter(values: any[], signal: AbortSignal): Promise<__esri.CodedValue[]> {
        if (!this.spatialFilterComponentState.useBuffer) {
            return this.codedValues;
        }

        const featureSet = await this.filterSublayer.queryFeatures({
            geometry: this.feature.geometry,
            outFields: [this.spatialFilter.layer.codeAttribute],
            distance: this.spatialFilterComponentState.buffer,
            units: "meters",
            where: await this.getFloorWhereClause()
        }, { signal });

        if (!Array.isArray(featureSet.features) || featureSet.features.length < 1) {
            return [];
        }

        const currentValue = this.feature.getAttribute(await this.realAttributeName(this.field.name));

        return this.codedValues.filter(codedValue => featureSet.features.some(feature => codedValue.code === feature.getAttribute(this.spatialFilter.layer.codeAttribute) || codedValue.code === currentValue));
    }
}

export default ContingentValuesHandler;

/** - Komponenta určující oblast podle které se filtrují hodnoty. */
function SpatialFilterComponent(props: ISpatialFilterComponentProps) {
    const [state, setState] = React.useState<ISpatialFilterComponentState>(props.lastState);

    return <div style={{ marginBottom: 10 }}>
        <Label
            style={{ 
                display: "flex",
                gap: 10,
                alignItems: "center"
            }}
            onClick={() => setState(oldState => {
                let newState: typeof oldState = { buffer: oldState.buffer, useBuffer: !oldState.useBuffer };
                props.onStateChange(newState);
                return newState;
            })}
        >
            <Checkbox
                checked={state.useBuffer}
            />
            Filtrovat podle polohy
        </Label>

        {
            state.useBuffer ? <NumericInput
                size="sm"
                value={state.buffer}
                min={1}
                onChange={newBuffer => {
                    setState(oldState => {
                        let newState: typeof oldState = { buffer: newBuffer, useBuffer: oldState.useBuffer };
                        props.onStateChange(newState);
                        return newState;
                    });
                }} 
            /> : null
        }
    </div>;
}

interface ISpatialFilterComponentProps {
    /** - Výchozí hodnoty state. */
    lastState: ISpatialFilterComponentState;
    /** - Funkce volající se při změně hodnot state. */
    onStateChange(buffer: ISpatialFilterComponentState): void;
}

interface ISpatialFilterComponentState {
    /** - Velikost obalové zóny pro prostorový dotaz filtrace v metrech. */
    buffer: number;
    /** - Má se aplikovat filtrace prostorovým dotazem? */
    useBuffer: boolean;
}