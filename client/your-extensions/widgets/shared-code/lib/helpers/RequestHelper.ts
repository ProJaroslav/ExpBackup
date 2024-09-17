import { JimuMapView } from "jimu-arcgis";
import { DbRegistryLoader, LayerHelper, GlobalSettingHelper } from "widgets/shared-code/helpers";
import ArcGISJSAPIModuleLoader from "./ArcGISJSAPIModuleLoader";
import { EDbRegistryKeys, EKnownLayerExtension } from "widgets/shared-code/enums";

export default class RequestHelper {
    private static readonly JSAPILoader = new ArcGISJSAPIModuleLoader(["request", "IdentityManager"]);
    private static userPermissions: Promise<HSI.SdWebService.IGetUserNameWithRoles>;

    /**
     * - Provedení esri dotazu ve formátu JSON.
     * @param url - Adresa dotazu.
     * @param body - Tělo dotazu.
     * @param signal - Signalizace přerušení dotazu.
     */
    public static async jsonRequest<T>(url: string, body: Object, signal?: AbortSignal): Promise<T> {
        if (!RequestHelper.JSAPILoader.isLoaded) {
            await RequestHelper.JSAPILoader.load();
        }
        const credential = await RequestHelper.JSAPILoader.getModule("IdentityManager").getCredential(url);
    
        const response = await RequestHelper.JSAPILoader.getModule("request")(url, {
            query: {
                ...body,
                f: "json",
                token: credential.token
            },
            signal
        });
    
        return response.data;
    }
    
    /**
     * - Získání hodnoty uložené v databázovém registru.
     * @deprecated Use {@link DbRegistryLoader}.
     * @see {@link https://hsi0916.atlassian.net/wiki/spaces/LETGIS/pages/2861924359/Db+registr+s+konfigurac#GetValue---z%C3%ADsk%C3%A1n%C3%AD-hodnoty-polo%C5%BEky-registru}
     * @param jimuMapView - Aktivní view mapy obsahujicí alespoň jednu mapovou službu s rozšířením {@link EKnownLayerExtension.DbRegistrySoe}.
     * @param body - Tělo dotazu.
     * @param signal - Signalizace přerušení dotazu.
     */
    public static async getDbRegistryValue<T extends HSI.DbRegistry.IDbRegistryValueType, S extends HSI.DbRegistry.IDbRegistryScope, N extends EDbRegistryKeys>(jimuMapView: JimuMapView, body: HSI.DbRegistry.IDbRegistry<T, S, N>, signal?: AbortSignal): Promise<HSI.DbRegistry.IDbRegistryValue<T, N>> {
        return DbRegistryLoader.fetchDbRegistryValue(jimuMapView, body, signal);
    }
    
    /**
     * - Uložení hodnoty do databázového registru.
     * @see {@link https://hsi0916.atlassian.net/wiki/spaces/LETGIS/pages/2861924359/Db+registr+s+konfigurac#GetValue---z%C3%ADsk%C3%A1n%C3%AD-hodnoty-polo%C5%BEky-registru}
     * @param jimuMapView - Aktivní view mapy obsahujicí alespoň jednu mapovou službu s rozšířením {@link EKnownLayerExtension.DbRegistrySoe}.
     * @param body - Tělo dotazu.
     * @param signal - Signalizace přerušení dotazu.
     */
    public static async setDbRegistryValue<T extends HSI.DbRegistry.IDbRegistryValueType, S extends HSI.DbRegistry.IDbRegistryScope, N extends EDbRegistryKeys>(jimuMapView: JimuMapView, body: HSI.DbRegistry.IDbRegistryWithValue<T, S, N>, signal?: AbortSignal): Promise<HSI.DbRegistry.IDbRegistry<T, S, N>> {
        /** - Mapová služba se zaplou SOE pro získání DB registrů. */
        const mapImageLayer = (await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.DbRegistrySoe, true))[0];

        if (body.name === EDbRegistryKeys.TableSettings) {
            localStorage.setItem(body.nameExtension, JSON.stringify(body.value));
            return;
        }

        const setDbRegistryValueUri = GlobalSettingHelper.get("setDbRegistryValue");

        const response = await RequestHelper.jsonRequest<HSI.DbRegistry.IDbRegistry<T, S, N>>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.DbRegistrySoe)}/${setDbRegistryValueUri}`, {
            name: DbRegistryLoader.getFullName(body),
            scope: body.scope,
            type: body.type,
            value: body.type === "json" ? JSON.stringify(body.value) : body.value
        }, signal);
    
        return response;
    }

    /**
     * - Poskytnutí rolí uživatele.
     * - Používá se na SD.
     */
    public static async providePermissions(): Promise<HSI.SdWebService.IGetUserNameWithRoles> {
        return new Promise(resolve => setTimeout(() => { resolve({"UserNameResult":{"Description":null,"FullName":null,"IsAuthenticated":true,"UserId":null,"UserName":"HSI\\kutik"},"UserRoles":["Pozemky", "PlatnostDat"]})}, 300));
        if (!RequestHelper.userPermissions) {
            RequestHelper.userPermissions = fetch(GlobalSettingHelper.get("permissionServiceUrl"))
                .then(res => {
                    return res.json() as Promise<{ GetUserNameWithRolesResult: HSI.SdWebService.IGetUserNameWithRoles }>;
                })
                .then(res => res.GetUserNameWithRolesResult);
        }

        return RequestHelper.userPermissions;
    }
};