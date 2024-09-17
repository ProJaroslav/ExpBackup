import { IntlShape } from "jimu-core";
import { FormatDateOptions } from "react-intl";
import ArcGISJSAPIModuleLoader from "./ArcGISJSAPIModuleLoader";

export default class DateHelper {
    public static readonly IntlModuleLoader = new ArcGISJSAPIModuleLoader(['intl']);
    
    /**
     * - Převod datumu do formátu "yyyy-MM-dd". Pokud je {@link withTime} rovno "true", tak bude formát datumu "yyyy-MM-ddThh:mm:sss"
     * - Tento formát vyžaduje komponenta TextInput.
     * @param value - Datum, který převádíme.
     * @param withTime - Má se v datumu zobrazit i čas?
     */
    public static inputFormat(value: Date | number, withTime?: boolean) {
        if (!value) {
            return;
        }
    
        if (typeof value === "number") {
            value = new Date(value);
        } else if (!(value instanceof Date)) {
            console.warn(`Unsupported date type '${value}'`);
            return;
        }
    
        const month = value.getMonth() + 1;
        const day = value.getDate();
        let year = value.getFullYear().toString();
    
        while (year.length > 0 && year.length < 4) {
            year = "0" + year;
        }
    
        const date = `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
    
        if (withTime) {
            const hours = value.getHours();
            const minutes = value.getMinutes();
            const seconds = value.getSeconds();
            return `${date}T${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
        }
    
        return date;
    }

    /**
     * - Převod datumu ve formátu "yyyy-MM-dd" nebo "yyyy-MM-ddThh:mm:ss" na milisekundy v lokálním čase.
     * @param value - Datum ve formátu "yyyy-MM-dd" nebo "yyyy-MM-ddThh:mm:ss". V tomto formátu poskytuje čas komponenta TextInput.
     */
    public static toLocaleTime(value: string): number {
        const date = new Date(value);
        if (typeof value === "string" && value.includes("T")) {// Pokud je v datumu i čas, tak se kupodivu nemusí řešit časové pásmo.
            return date.getTime();
        }
        return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000).getTime();
    }

    /**
     * - Převedení datumu do formátu podle lokality uživatele.
     * @param intl - {@link https://developers.arcgis.com/experience-builder/guide/extend-base-widget/#i18n-support}
     * @param value - Datum který chceme zformátovat.
     * @param opts - Parametry formátování.
     */
    public static formatIntTime(intl: IntlShape, value: string | number | Date, opts?: IFormatIntTimeOptions) {
        if (!value) {
            return null;
        }

        let formatTimeOptions: FormatDateOptions;

        if (!opts.fieldFormat || typeof opts.fieldFormat?.dateFormat !== "string" || opts.fieldFormat.dateFormat === ("default" as any /** Od verze 1.14 není hodnota "default" */)) {
            formatTimeOptions = intl.formatters.getDateTimeFormat(intl.locale).resolvedOptions() as FormatDateOptions;
        } else if (!DateHelper.IntlModuleLoader.isLoaded) {
            DateHelper.IntlModuleLoader
                .load()
                .then(opts?.onToolLoad);
        } else {
            formatTimeOptions = DateHelper.IntlModuleLoader.getModule("intl").convertDateFormatToIntlOptions(opts.fieldFormat.dateFormat);
        }

        if (!opts.fieldFormat?.dateFormat?.includes("time")) {
            return intl.formatDate(value, formatTimeOptions);
        }
        
        return intl.formatTime(value, formatTimeOptions);
    }

    /**
     * - Převod datumu do formátu /Date([miliseconds]+0100)/.
     * @param value - Datum, který převádíme.
     */
    public static toDateString(value: Date | number) {
        if (value instanceof Date) {
            value = value.getTime();
        }
        return `\/Date(${value}+0100)\/`;
    }

    /**
     * - Převod datumu ve formátu /Date([miliseconds]+0100)/ na milisekundy.
     * @param value - Datum ve formátu /Date([miliseconds]+0100)/
     */
    public static dateStringToMiliseconds(value: string) {
        const parsedValue = /^\/Date\(([0-9 | \+]+)\)\//g.exec(value);
        return parseInt(parsedValue[1]);
    }
};


interface IFormatIntTimeOptions {
    fieldFormat?: __esri.FieldInfoFormat;
    /** - Zavolá se při načtení nezbytných nástrojů pro správný převod datumu (např. aby mohlo dojít k rerenderu). */
    onToolLoad?: () => void;
}