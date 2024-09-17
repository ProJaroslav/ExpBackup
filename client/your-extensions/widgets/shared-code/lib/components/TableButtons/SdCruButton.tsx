import { React } from "jimu-core";
import { useUserRolesState } from "widgets/shared-code/hooks";
import { LoadingButton, EditButton } from "widgets/shared-code/components";
import { DateHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";

const { forwardRef } = React;

/**
 * - Tlačítko pro editaci prvku na základě rolí.
 * - Práva editovat se reší uživatelskými rolemi.
 * - Použitelné asi pouze na SD.
 */
export default forwardRef<HSI.FeatureTableComponent.IEditButtonMethods, React.PropsWithChildren<HSI.FeatureTableComponent.ISdCruButton>>(function({ sourceClass, children, provideLayer, featureProvider, saveFeature, disabled }, ref) {
    const userRolesState = useUserRolesState(sourceClass);

    if (userRolesState.loadStatus !== ELoadStatus.Loaded || !userRolesState.hasPermisson) {
        return <LoadingButton
            disabled
            loading={userRolesState.loadStatus === ELoadStatus.Pending}
        >
            {children}
        </LoadingButton>;
    }

    return <SdCruButton
        ref={ref}
        UserRoles={userRolesState.UserRoles}
        objectClass={userRolesState.objectClass}
        provideLayer={provideLayer}
        featureProvider={featureProvider}
        saveFeature={saveFeature}
        disabled={disabled}
    >{children}</SdCruButton>;
})

const SdCruButton = forwardRef<HSI.FeatureTableComponent.IEditButtonMethods, React.PropsWithChildren<ICruButton>>(({ provideLayer, UserRoles, objectClass, children, featureProvider, saveFeature, disabled }, ref) => {
    /**
     * - Uložení {@link feature prvku}.
     * @param feature - Prvek, který chceme uložit.
     * @param fields - Pole {@link feature prvku}.
     */
    async function doSaveFeature(feature: __esri.Graphic, fields: Array<__esri.Field>) {
        const attributes = { ...feature.attributes };

        fields.forEach(({ type, name }) => {
            if ((type === "date" || type === "date-only" || type === "time-only") && !!attributes[name]) {
                attributes[name] = DateHelper.inputFormat(attributes[name], true).replace("T", " ");
            }
        });

        return saveFeature(feature, attributes);
    }

    /** - Poskytnutí editovaného prvku a jeho polí.*/
    async function dataProvider(): Promise<HSI.EditTableComponent.ILoadedState> {
        const layer = await provideLayer();

        if (!layer.loaded) {
            await layer.load();
        }

        let outFields = ["*"];

        if (Array.isArray(objectClass.fields)) {
            outFields = objectClass.fields.map(({ name }) => name).filter(fieldName => layer.fields.some(({ name }) => name == fieldName));
        }

        const { feature, fields } = await featureProvider(layer, outFields);

        if (Array.isArray(objectClass.fields)) {
            fields.forEach(field => {
                let fieldConfig = objectClass.fields.find(({ name }) => field.name === name);
                field.editable = (Array.isArray(fieldConfig.editRight) && fieldConfig.editRight.some(UserRoles.includes)) || (typeof fieldConfig.editRight === "string" && UserRoles.includes(fieldConfig.editRight))
                if (fieldConfig.required) {
                    field.nullable = false;
                }
            });
        }

        return {
            feature,
            fields
        };
    }

    return <EditButton
        ref={ref}
        dataProvider={dataProvider}
        saveFeature={doSaveFeature}
        disabled={disabled}
    >
        {children}
    </EditButton>;
});

interface ICruButton extends Pick<HSI.FeatureTableComponent.ISdCruButton, "disabled" | "featureProvider" | "provideLayer" | "saveFeature">, Pick<HSI.SdWebService.IGetUserNameWithRoles, "UserRoles"> {
    objectClass: HSI.DbRegistry.IFromDataObjectClass;
}