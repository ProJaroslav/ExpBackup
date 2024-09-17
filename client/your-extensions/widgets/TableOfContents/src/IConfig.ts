import { ImmutableObject } from "jimu-core";
import { EConstants } from "widgets/shared-code/enums";

interface IConfig {
    /** - Klíč pod kterým je v konfiguraci v databázovém registru uloženo nastavení pro tento widget. */
    [EConstants.tocSettingKey]: string;
    enableLegend: false;
}

export type IMConfig = ImmutableObject<IConfig>;

export default IMConfig;