import { getAppStore, Immutable, type ImmutableObject} from "jimu-core";
import { getAppConfigAction } from "jimu-for-builder";
import { EGlobalSettings, EKnownLayerExtension } from "widgets/shared-code/enums";

/**
 * - Helper pro získávání a nastavování globální konfigurace napříč widgety.
 */
export default class GlobalSettingHelper {
    /**
     * - Poskytuje hodnotu z globálaního nastavení.
     * - Pokud hodnota není nefinována, tak se použije výchozí hodnota.
     * @param property - Klíč pod kterým je hodnota uložena v nastavení.
     */
    public static get<T extends keyof HSI.IHsiSetting>(property: T): ImmutableObject<HSI.IHsiSetting>[T] {
        return getAppStore().getState().getIn(["appConfig", "attributes", "HSI_Setting", property], defaultSettingValue[property]);
    }

    /**
     * - Poskytuje hodnotu z globálaního nastavení.
     * - Pokud hodnota není nefinována, tak se použije výchozí hodnota.
     * @param propertyPath - Cesta k hodnotě.
     */
    public static getIn<T extends keyof HSI.IHsiSetting, K extends keyof HSI.IHsiSetting[T], M extends [T, K]>(propertyPath: M): HSI.IHsiSetting[T][K];
    /**
     * - Poskytuje hodnotu z globálaního nastavení.
     * - Pokud hodnota není nefinována, tak se použije výchozí hodnota.
     * @param propertyPath - Cesta k hodnotě.
     */
    public static getIn<T extends keyof HSI.IHsiSetting, K extends keyof HSI.IHsiSetting[T], L extends keyof HSI.IHsiSetting[T][K], M extends [T, K, L]>(propertyPath: M): HSI.IHsiSetting[T][K][L];
    /**
     * - Poskytuje hodnotu z globálaního nastavení.
     * - Pokud hodnota není nefinována, tak se použije výchozí hodnota.
     * @param propertyPath - Cesta k hodnotě.
     */
    public static getIn(propertyPath: Array<string>): any {
        return getAppStore().getState().getIn(["appConfig", "attributes", "HSI_Setting", ...propertyPath], defaultSettingValue.getIn(propertyPath));
    }

    /** - Poskytuje globálaní nastavení. */
    public static get value(): ImmutableObject<HSI.IHsiSetting> {
        return getAppStore().getState().getIn(["appConfig", "attributes", "HSI_Setting"], defaultSettingValue);
    }

    /** - Nastaví globálnímu nastavení výchozí hodnoty. */
    public static setDefaultValue(): void {
        if (!window.jimuConfig.isInBuilder) {
            throw new Error("Setting global settings outside of builder is not supported");
        }
        getAppStore().getState().setIn(["appConfig", "attributes", "HSI_Setting"], defaultSettingValue);
    }

    /**
     * - Změna hodnoty v globálním nastavení.
     * @param property - Klíč pod kterým je hodnota uložena v nastavení.
     * @param value - Nová hodnota.
     */
    public static set<T extends keyof HSI.IHsiSetting>(property: T, value: HSI.IHsiSetting[T]): void {
        if (!window.jimuConfig.isInBuilder) {
            throw new Error("Setting global settings outside of builder is not supported");
        }
        const attributes = getAppStore().getState().getIn(["appConfig", "attributes"]);
        getAppConfigAction().editAttributes(attributes.setIn(["HSI_Setting", property], value)).exec();
    }
}

const defaultSettingValue: ImmutableObject<HSI.IHsiSetting> = Immutable({
    globalSettings: EGlobalSettings.DbRegistry,
    bdRegistryKeyPrefix: "lp.letgis",
    tokenMapServiceName: false,
    permissionServiceUrl: "https://sdagsdase106.hsi.lan/SdWebService/UserAuthenticationService.svc/rest/GetUserNameWithRoles",
    checkPermissions: false,
    environmentProcessor: false,
    serviceExtensions: [{
        key: EKnownLayerExtension.AssetManagementSoe,
        value: "LetGisSoe"
    }, {
        key: EKnownLayerExtension.DbRegistrySoe,
        value: "LetGisSoe"
    }, {
        key: EKnownLayerExtension.DomainSoe,
        value: "LetGisSoe"
    }, {
        key: EKnownLayerExtension.FeatureServer,
        value: "FeatureServer"
    }, {
        key: EKnownLayerExtension.HistorySoe,
        value: "LetGisSoe"
    }, {
        key: EKnownLayerExtension.RelationSoe,
        value: "LetGisSoe"
    }, {
        key: EKnownLayerExtension.SdSoe,
        value: "SdMapServerSoe"
    }],
    getDbRegistryValue: "Settings/GetValue",
    setDbRegistryValue: "Settings/SetValue"
});

interface II {
    getValue: ImmutableObject<HSI.IHsiSetting>['getIn'];
}