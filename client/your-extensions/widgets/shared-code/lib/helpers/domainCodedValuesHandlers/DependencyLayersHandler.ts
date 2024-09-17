import { JimuMapView } from "jimu-arcgis";
import { FeatureHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import CodedValuesHandlerBase from "./CodedValuesHandlerBase";

/** - Třída pro filtraci doménových hodnot {@link field pole} na základě hodnot {@link feature prvku}, pomocí prvků z jiné omezující vrstvy. */
export class DependencyLayersHandler extends CodedValuesHandlerBase {
    /** - Definice vrstvy podle které se filtrují {@link codedValues doménové hodnoty}. */
    private dependencyLayerDefinition: HSI.CodedValuesHandler.IDependencyLayerDefinition;
    /** - Vrstva ve které se vyhledávají prvky podle kterých se filtrují {@link codedValues doménové hodnoty}. */
    private dependencyLayer: __esri.FeatureLayer | __esri.Sublayer;
    /**
     * - Původní (nezeditovaná) hodnota {@link field tohoto atributu} a {@link IDependencyLayerDefinition.dependencyAttributeName omezujícího atributu}.
     * - {@link ICurrentValueForDependency.value Tato doména} bude ve výsledných doménách vždy když je hodnota {@link IDependencyLayerDefinition.dependencyAttributeName omezujícího atributu} rovna {@link ICurrentValueForDependency.dependencyValue původní hodnotě}. A to i v případě, že není vyhledána v {@link dependencyLayer omezující vrstvě}.
     * - Důvod je ten, že pokud je {@link dependencyLayer omezující vrstva} pohledem, který nabízí pouze nepoužité hodnoty, tak by nebylo možné použít původní hodnotu.
     */
    private currentValueForDependency: ICurrentValueForDependency;

    /**
     * - Třída pro filtraci doménových hodnot {@link field pole} na základě hodnot {@link feature prvku}, pomocí prvků z jiné omezující vrstvy.
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

        const dependencyLayer = Array.isArray(configuration?.dependencyLayers) && configuration.dependencyLayers.find(dependencyLayer => FeatureHelper.compareFieldName(dependencyLayer.attributeName, this.field));

        if (!dependencyLayer) {
            return false;
        }

        this.dependencyLayerDefinition = dependencyLayer;

        return true;
    }

    protected override async prepareFilterValues(): Promise<void> {
        if (!this.dependencyLayerDefinition.dependencyAttributeName) {
            throw new Error(`Není definován atribut podle jehož hodnoty se omezuje číselník "dependencyAttributeName"`);
        }
        if (!this.dependencyLayerDefinition.dependencyLayerAttributeName) {
            throw new Error(`Není definován atribut kterým se podle omezujících prvků omezuje číselník "dependencyLayerAttributeName"`);
        }
        if (!this.dependencyLayerDefinition.dependencyLayerSearchAttributeName) {
            throw new Error(`Není definován atribut podle kterého se vyhledávají omezující prvky "dependencyLayerSearchAttributeName"`);
        }

        this.dependencyLayer = await LayerDefinitionHelper.findLayerByDefinition(this.jimuMapView, this.dependencyLayerDefinition.layer);

        /** - Atribut podle jehož hodnoty se omezují {@link codedValues doméhové hodnoty}. */
        const dependencyFieldName = await this.realAttributeName(this.dependencyLayerDefinition.dependencyAttributeName);

        this.dependAttributes = [dependencyFieldName];

        /** - Současná hodnota {@link field atributu} v {@link feature prvku}. */
        const currentValue = this.codedValues.find(codedValue => codedValue.code === this.feature.getAttribute(this.field.name));
        if (!!currentValue) {
            this.currentValueForDependency = {
                value: currentValue,
                dependencyValue: this.feature.getAttribute(dependencyFieldName)
            };
        }
        
    }

    protected override async filter(values: any[], signal: AbortSignal): Promise<__esri.CodedValue[]> {
        /** - Současná hodnota {@link IDependencyLayerDefinition.dependencyAttributeName omezujícího atributu} v {@link feature prvku}. */        
        const value = values[0];
        if (this.dependencyLayer.loadStatus !== "loaded") {
            await this.dependencyLayer.load();
        }

        const reducedCodedValues: Array<__esri.CodedValue> = [];

        if (!!this.currentValueForDependency && this.currentValueForDependency.dependencyValue === value) {
            reducedCodedValues.push(this.currentValueForDependency.value);
        }

        /** - Atribut kterým se podle omezujících prvků omezuje číselník. */
        const dependencyLayerAttribute = this.dependencyLayer.fields.find(f => FeatureHelper.compareFieldName(f, this.dependencyLayerDefinition.dependencyLayerAttributeName));

        /** - Prvky podle kterých se filtrují {@link codedValues povolené doménové hodnoty}. */
        const dependencyFeatures = await this.dependencyLayer.queryFeatures({
            returnGeometry: false,
            where: this.getWhereClause(value),
            outFields: [dependencyLayerAttribute.name]
        }, { signal });

        if (Array.isArray(dependencyFeatures?.features)) {
            for (let feature of dependencyFeatures.features) {
                let codedValue = this.codedValues.find(cv => cv.code == feature.getAttribute(dependencyLayerAttribute.name));

                if (!!codedValue && !reducedCodedValues.includes(codedValue)) {
                    reducedCodedValues.push(codedValue);
                }
            }
        }

        return reducedCodedValues;
    }

    /**
     * - Vytvoření where klauzule pro vyhledání omezujících prvků v {@link dependencyLayer omezující vrstvě}, na základě {@link value hodnoty omezujícího atrubutu}.
     * @param value - Hodnota pro kterou se vytváří where klauzule.
     */
    private getWhereClause(value: any): string {
        /** - Atribut podle kterého se vyhledávají omezující prvky. */
        const dependencyLayerSearchAttribute = this.dependencyLayer.fields.find(f => FeatureHelper.compareFieldName(f, this.dependencyLayerDefinition.dependencyLayerSearchAttributeName));
        /** - Klauzule pro vyhledání omezujících prvků. */
        let where: string;

        if (Array.isArray(this.dependencyLayerDefinition.whereClauses)) {
            where = this.dependencyLayerDefinition.whereClauses.find(whereClauseDefinition => whereClauseDefinition.value === value)?.whereClause;
        }

        if (!where) {
            where = FeatureHelper.getEqualCondition(dependencyLayerSearchAttribute.name, this.dependencyLayer.fields, value);
        } else {
            where = where.replace("{0}", dependencyLayerSearchAttribute.name);
        }

        return where;
    }
}

interface ICurrentValueForDependency {
    /** - Doménová hodnota. */
    value: __esri.CodedValue;
    /** - Hodnota pro kterou bude {@link value doménová hodnota} akceptována i pokud nebude splňovat podmínky. */
    dependencyValue: any;
}

export default DependencyLayersHandler;