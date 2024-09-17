import { JimuMapView } from "jimu-arcgis";
import { RequestHelper, LayerHelper, WidgetStateHelper, GlobalSettingHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, EKnownLayerExtension } from "widgets/shared-code/enums";

export default class DbRegistryLoader {
    private static readonly requests: {
        [key: string]: {
            value: Promise<HSI.DbRegistry.IDbRegistryWithValue<any, any, any>>;
            expirationTime: number;
        };
    } = {};

    /**
     * - Získání hodnoty uložené v databázovém registru.
     * @see {@link https://hsi0916.atlassian.net/wiki/spaces/LETGIS/pages/2861924359/Db+registr+s+konfigurac#GetValue---z%C3%ADsk%C3%A1n%C3%AD-hodnoty-polo%C5%BEky-registru}
     * @param jimuMapView - Aktivní view mapy obsahujicí alespoň jednu mapovou službu s rozšířením {@link EKnownLayerExtension.DbRegistrySoe}.
     * @param body - Tělo dotazu.
     * @param signal - Signalizace přerušení dotazu. Nepoužívat!
     */
    public static async fetchDbRegistryValue<T extends HSI.DbRegistry.IDbRegistryValueType, S extends HSI.DbRegistry.IDbRegistryScope, N extends EDbRegistryKeys>(jimuMapView: JimuMapView, body: HSI.DbRegistry.IDbRegistry<T, S, N>, signal?: AbortSignal): Promise<HSI.DbRegistry.IDbRegistryValue<T, N>> {

        const key = DbRegistryLoader.getRequestKey(jimuMapView, body);

        let request = DbRegistryLoader.requests[key];
        let response: Promise<HSI.DbRegistry.IDbRegistryWithValue<T, S, N>>;

        if (request?.expirationTime > Date.now()) {
            response = request.value;
        }

        if (!response) {
            response = (async function() {
                /** - Mapová služba se zaplou SOE pro získání DB registrů. */
                const mapImageLayer = (await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.DbRegistrySoe, body.throwWhenSoeNotFound))[0];
            
                if (!mapImageLayer) {
                    return null;
                }
            
                const getDbRegistryValueUri = GlobalSettingHelper.get("getDbRegistryValue");

                body.name = DbRegistryLoader.getFullName(body) as any;
                const res = await RequestHelper.jsonRequest<HSI.DbRegistry.IDbRegistryWithValue<T, S, N>>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.DbRegistrySoe)}/${getDbRegistryValueUri}`, body);

                if ("error" in res) {
                    console.warn(res);
                    throw new Error(typeof res["error"] === "string" || !("message" in (res["error"] as any)) ? res : res["error"]['message'] as any);
                }

                return res;
            })();

            DbRegistryLoader.requests[key] = {
                expirationTime: Date.now() + 60 * 60 * 1000,
                value: response
            }

            response
                .catch(err => {
                    delete DbRegistryLoader.requests[key];
                    throw(err);
                });
        }

        const value = await response;

        return value?.value;
    }

    /**
     * - Načtení {@link IEditabilityConfiguration konfigurace editovatelnosti} z DB registrů, která je uložená pod kíčem s {@link nameExtensionObj rozšířením}.
     * - Pokud {@link nameExtensionObj rozšíření klíče} není definováno, tak se použije rozšíření z konfigurace widgetu "SelectionResult";
     * @param jimuMapView - Aktivní pohled mapy obsahujicí alespoň jednu mapovou službu s rozšířením {@link EKnownLayerExtension.DbRegistrySoe}.
     * @param nameExtensionObj - Objekt obsahující rozšíření klíče, pod kterým je v DB registrech uložena {@link IEditabilityConfiguration konfigurace editovatelnosti}.
     */
    public static async fetchEditabilityDbRegistryValue(jimuMapView: JimuMapView, nameExtensionObj: Pick<HSI.DbRegistry.IDbRegistry<"json", "g", EDbRegistryKeys.Editability>, "nameExtension"> = {}) {
        let nameExtension: string;
        if ((typeof nameExtensionObj !== "object" ||!("nameExtension" in nameExtensionObj)) && WidgetStateHelper.containsWidgetWithName("SelectionResult")) {
            nameExtension = WidgetStateHelper.getWidgetConfigurationByName("SelectionResult")[0].dbRegistryConfigKey;
        } else {
            nameExtension = nameExtensionObj.nameExtension;
        }

        return DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.Editability, scope: "g", type: "json", nameExtension });
    }

    /** - Poskytuje celý konfigurační klíč složený z {@link IHsiSetting globálního nastavení} a paramwtru "name" (popřípadě i "nameExtension") v {@link body}. */
    public static getFullName(body: Pick<HSI.DbRegistry.IDbRegistry<HSI.DbRegistry.IDbRegistryValueType, HSI.DbRegistry.IDbRegistryScope, EDbRegistryKeys>, "name" | "nameExtension">): string {
        let name: string = body.name;
        if (body.nameExtension) {
            name = name.endsWith(".json") ? name.replace(".json", `.${body.nameExtension}.json`) : `${name}.${body.nameExtension}`;
        }

        const bdRegistryKeyBase = GlobalSettingHelper.get("bdRegistryKeyPrefix");

        if (typeof bdRegistryKeyBase === "string") {
            name = `${bdRegistryKeyBase}.${name}`;
        }

        return name;
    }

    private static getRequestKey<T extends HSI.DbRegistry.IDbRegistryValueType, S extends HSI.DbRegistry.IDbRegistryScope, N extends EDbRegistryKeys>(jimuMapView: JimuMapView, body: HSI.DbRegistry.IDbRegistry<T, S, N>): string {
        return `${jimuMapView.id}_${body.name['replaceAll'](".", "_")}`;
    }
}