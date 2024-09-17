import { React } from "jimu-core";
import { SdEditButton } from "widgets/shared-code/components";
import { LayerHelper } from "widgets/shared-code/helpers";

/**
 * - Tlačítko pro editaci prvku.
 * - Práva editovat se reší uživatelskými rolemi.
 * - Použitelné asi pouze na SD.
 */
export default function({ sourceClass, dynamicServiceUrl, workspaceId, children, oid, onEdited, tableRef }: React.PropsWithChildren<HSI.FeatureTableComponent.ISdDynamicSourceEditButton>) {
    return <SdEditButton
        oidProvider={() => Promise.resolve(oid)}
        provideLayer={() => LayerHelper.createDynamicDataSourceLayer(dynamicServiceUrl, workspaceId, sourceClass, true)}
        sourceClass={sourceClass}
        tableRef={tableRef}
        onEdited={onEdited}
    >
        {children}
    </SdEditButton>;
}