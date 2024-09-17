import { React, useIntl } from "jimu-core";

/**
 * - Hook poskytujicí funkci pro překlady textů.
 * @see {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/#i18n-support}
 * @param defaultTranslations - Výchozí překlady textů, které se používají v případě, že widget nepodporuje aktivní jazyk uživatele.
 */
export default function<T extends {[key: string]: string}>(defaultTranslations: T) {
    const intl = useIntl();

    /**
     * - Poskytuje překlad textu v aktivním jazyce uživatele.
     * @param id - Klíč pod kterým je text uložen.
     */
    const formatMessage = React.useCallback((id: keyof T): string => {
        return intl.formatMessage({ id: id as string, defaultMessage: defaultTranslations[id] });
    }, [defaultTranslations]);

    return formatMessage;
}