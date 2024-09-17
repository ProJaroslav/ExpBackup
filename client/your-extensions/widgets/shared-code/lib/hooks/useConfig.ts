import { ConfigContext } from "widgets/shared-code/contexts";
import { React, ImmutableObject } from "jimu-core"

/** - Poskytuje konfiguraci widgetu poskytnutou jednou z rodičovských komponent. */
export function useConfig<T extends ImmutableObject<any>>(): T {
    return React.useContext(ConfigContext);
}

export default useConfig;