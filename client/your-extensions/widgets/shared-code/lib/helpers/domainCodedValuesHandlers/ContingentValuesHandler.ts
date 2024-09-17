import { JimuMapView } from "jimu-arcgis";
import { FeatureHelper, LayerHelper, RequestHelper } from "widgets/shared-code/helpers";
import CodedValuesHandlerBase from "./CodedValuesHandlerBase";
import { EKnownLayerExtension } from "widgets/shared-code/enums";

/** - Třída pro filtraci doménových hodnot {@link field pole} na základě hodnot {@link feature prvku}, pomocí Contingent Values. */
export class ContingentValuesHandler extends CodedValuesHandlerBase {
    /** - Definice omezujicích podmínek pro {@link field tento atribut}. */
    private contingentValueDefinitions: HSI.DbRegistry.IContingentValuesDbValue['mapServices'][0]['layers'][0]['contingentValueDefinitions'];
    /**
     * - Omezujicí podmínky pro {@link field tento atribut}.
     * - Podmínky jsou ve stejném pořadí jako {@link dependAttributes omezující atributy}.
     */
    private contingentValuesConditions: Array<IContingentValuesConditions>;

    /**
     * - Třída pro filtraci doménových hodnot {@link field pole} na základě hodnot {@link feature prvku}, pomocí Contingent Values.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param feature - Prvek podle jehož hodnot filtrujeme doménové hodnoty.
     * @param field - Pole ze zdrojové vrtvy {@link feature prvku}, jehož doménové hodnoty filtrijeme.
     * @param signal - Signalizace přerušení aktivity této instance objektu.
     */
    constructor(jimuMapView: JimuMapView, feature: __esri.Graphic, field: __esri.Field, signal: AbortSignal) {
        super(jimuMapView, feature, field, signal);
    }
    
    protected override async canFilter(): Promise<boolean> {
        const configuration = await this.fetchConfiguration();

        if (!Array.isArray(configuration?.contingentValueDefinitions)) {
            return false;
        }

        this.contingentValueDefinitions = configuration.contingentValueDefinitions
            .filter(contingentValueDefinition => {
                if (!Array.isArray(contingentValueDefinition.fieldOrder)) {
                    return false;
                }

                return contingentValueDefinition.fieldOrder.findIndex(fieldName => FeatureHelper.compareFieldName(fieldName, this.field)) > 0 //Pokud je na prvním místě tak nás nezajímá
            });

        return this.contingentValueDefinitions.length > 0;
    }

    protected override async prepareFilterValues(): Promise<void> {
        if (!(await LayerHelper.hasExtension(this.mapImageLayer, EKnownLayerExtension.FeatureServer))) {
            console.warn(`Map service "${this.mapImageLayer.title}" does not have FeatureServer extension`);
            return;
        }

        await this.getContingentValuesConditions();

        if (this.contingentValuesConditions.length > 0) {
            this.dependAttributes = await Promise.all(this.contingentValuesConditions.map(contingentValuesCondition => this.realAttributeName(contingentValuesCondition.field.name)));
        }
    }

    protected override async filter(values: Array<any>): Promise<Array<__esri.CodedValue>> {
        return values.reduce<typeof this.codedValues>((codedValues, value, index) => {
            let acceptibleValues = this.contingentValuesConditions[index].conditions.find(condition => condition.value == value)?.acceptibleValues || [];

            return codedValues.filter(codedValue => acceptibleValues.includes(codedValue.code))
        }, this.codedValues);
    }

    /** - Vyhledání Contingent Values pro {@link layerId tuto vrstvu}. */
    private fetchContingentValues(): Promise<IQueryContingentValuesResponse> {
        return RequestHelper.jsonRequest<IQueryContingentValuesResponse>(`${this.mapImageLayer.url.replace("MapServer", "FeatureServer")}/queryContingentValues`, {
            layers: `[${this.layerId}]`
        }, this.signal);
    }
    
    /** - Vyhledání {@link contingentValuesConditions omezujicích podmínek} pro {@link field tento atribut}. */
    private async getContingentValuesConditions(): Promise<void> {
        this.contingentValuesConditions = [];

        const [fields, contingentValues] = await Promise.all([ this.findFields(), this.fetchContingentValues() ]);

        /** - Contingent Values pro {@link layerId tuto vrstvu}. */
        const relevantFieldGroups = contingentValues?.contingentValueSets?.[0]?.fieldGroups
            ?.filter(fieldGroup => this.contingentValueDefinitions
                .some(contingentValueDefinition => contingentValueDefinition.name === fieldGroup.name));

        if (Array.isArray(relevantFieldGroups) && !this.signal.aborted) {
            for (let fieldGroups of relevantFieldGroups) {
                const contingentValueDefinition = this.contingentValueDefinitions.find(contingentValueDefinition => contingentValueDefinition.name === fieldGroups.name);

                const thisFieldIndex = contingentValueDefinition.fieldOrder.indexOf(this.field.name);

                for (let contingency of fieldGroups.contingencies) {
                    for (let index = 0; index < thisFieldIndex; index++) {
                        const field = fields.find(f => FeatureHelper.compareFieldName(f,contingentValueDefinition.fieldOrder[index]));
                        const value = contingency.values[index];
                        /** - Již existující podmínka. */
                        let contingentValuesCondition = this.contingentValuesConditions.find(condition => FeatureHelper.compareFieldName(condition.field, field));

                        if (!contingentValuesCondition) {
                            contingentValuesCondition = { field, conditions: [] };
                            this.contingentValuesConditions.push(contingentValuesCondition);
                        }

                        let condition = contingentValuesCondition.conditions.find(condition => condition.value === value);

                        if (!condition) {
                            condition = { value, acceptibleValues: [] };
                            contingentValuesCondition.conditions.push(condition);
                        }

                        if (!condition.acceptibleValues.includes(contingency.values[thisFieldIndex])) {
                            condition.acceptibleValues.push(contingency.values[thisFieldIndex]);
                        }
                    }
                }
            }
        }
    }
}

interface IContingentValuesConditions {
    /** - Atribut, podle jehož hodnoty redukují možné hodnoty domény. */
    field: __esri.Field;
    /** - Hodnoty {@link field tohoto atributu}, podle kterých se redukují možné hodnoty domény. */
    conditions: Array<{
        value: IQueryContingentValuesResponse['contingentValueSets'][number]['fieldGroups'][number]['contingencies'][number]['values'][number];
        acceptibleValues: IQueryContingentValuesResponse['contingentValueSets'][number]['fieldGroups'][number]['contingencies'][number]['values'];
    }>;
}

interface IQueryContingentValuesResponse {
    contingentValueSets: Array<{
        layerId: number;
        stringDictionary: Array<unknown>;
        fieldGroups: Array<{
            name: string,
            contingencies: Array<{
                id: number;
                subtypeCode: number;
                values: Array<number | string>;
            }>;
        }>;
    }>;
};

export default ContingentValuesHandler;