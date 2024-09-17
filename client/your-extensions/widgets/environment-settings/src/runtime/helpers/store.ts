/**
 * - Uložení nového prostředí.
 * @param environment - Nové prostředí.
 * @param key - Klíč prostředí.
 */
export async function storeEnvironment(environment: HSI.EnvironmentSettingsWidget.IEnvironment, key?: string) {
    let environments: Array<HSI.EnvironmentSettingsWidget.IEnvironment>;
    try {
        environments = await loadEnvironments(key);
    } catch(err) {
        console.warn(err);
    }

    if (!Array.isArray(environments)) {
        environments = [];
    }

    environments.push(environment);

    return setEnvironments(environments, key);
}

/**
 * - Odstranění prostředí.
 * @param environmentId - Id prostředí k odstranění.
 * @param key - Klíč prostředí.
 */
export async function removeEnvironment(environmentId: string, key?: string) {
    let environments: Array<HSI.EnvironmentSettingsWidget.IEnvironment>;
    try {
        environments = await loadEnvironments(key);
    } catch(err) {
        console.warn(err);
    }

    if (Array.isArray(environments)) {
        environments = environments.filter(({ id }) => id !== environmentId);

        if (environments.length > 0) {
            localStorage.setItem(getFullKey(key), JSON.stringify(environments));
        } else {
            localStorage.removeItem(getFullKey(key));
        }

    }

}

/**
 * - Načítá uložená prostředí.
 * @param key - Klíč prostředí.
 */
export async function loadEnvironments(key?: string): Promise<Array<HSI.EnvironmentSettingsWidget.IEnvironment>> {
    const environmentsJson = localStorage.getItem(getFullKey(key));

    if (!environmentsJson) {
        return [];
    }
    
    return JSON.parse(environmentsJson);
}

/**
 * - Ukládá {@link environments prostředí}.
 * - Pokud pod {@link key klíčem} již prostředí existují, tak se nesloučí ale přepíšou.
 * @param environments - Prostředí která chceme uložit.
 * @param key - Klíč prostředí.
 */
export async function setEnvironments(environments: Array<HSI.EnvironmentSettingsWidget.IEnvironment>, key?: string) {
    localStorage.setItem(getFullKey(key), JSON.stringify(environments));
}

function getFullKey(key: string = 'default') {
    const STORAGE_PREFIX = "HSI_ENVIRONMENT";
    return `${STORAGE_PREFIX}_${key}`;
}