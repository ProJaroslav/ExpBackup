import { React } from "jimu-core";
import { SdCruButton } from "widgets/shared-code/components";
import { ArcGISJSAPIModuleLoader, FeatureHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";

const { useContext } = React;
const ModuleLoader = new ArcGISJSAPIModuleLoader(["Graphic"]);

/**
 * - Tlačítko pro vytvoření prvku v tabulce.
 * - Práva editovat se reší uživatelskými rolemi.
 * - Použitelné asi pouze na SD.
 */
export default function({ tableRef, sourceClass, children, provideLayer, disabled }: React.PropsWithChildren<HSI.FeatureTableComponent.ISdCreateButton>) {
    const jimuMapView = useContext(JimuMapViewContext);

    return <SdCruButton
        featureProvider={(layer, outFields) => {
            return Promise.all([
                ModuleLoader.load(),
                layer.load()
            ])
            .then(() => {
                const feature = new (ModuleLoader.getModule("Graphic"))({ attributes: {} });
                FeatureHelper.setSourceLayer(feature, layer);
                return { feature, fields: outFields[0] === "*" ? layer.fields : layer.fields.filter(({ name }) => outFields.includes(name)) };
            });
        }}
        provideLayer={provideLayer}
        saveFeature={(feature, attributes) => {
            return FeatureHelper.applyEditsInTable(jimuMapView, { adds: [{
                table: sourceClass,
                attributes
            }] })
            .then(() => {
                tableRef.current.refresh();
            });
        }}
        sourceClass={sourceClass}
        disabled={disabled}
    >
        {children}
    </SdCruButton>;
}