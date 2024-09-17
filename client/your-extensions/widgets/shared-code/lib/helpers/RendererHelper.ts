export default class RendererHelper {
    /**
     * - Poskytuje pole hodnot, které prvek musí obsahovat, aby na něj byla aplikována symbologie z {@link uniqueValue}.
     * @param uniqueValueRenderer - Renderer ze kterého je vzatá informace o renderování {@link uniqueValue}.
     * @param uniqueValue - Informace o konkrétním renderování v rámci rendereru {@link uniqueValueRenderer} ([Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-renderers-UniqueValueRenderer.html#uniqueValueInfos)).
     */
    public static getUniqueRendererValues(uniqueValueRenderer: __esri.UniqueValueRenderer, uniqueValue: __esri.UniqueValueInfo): [string, string, string] | [number] {
        return typeof uniqueValue.value === "string" ? uniqueValue.value.split(uniqueValueRenderer.fieldDelimiter || "") as [string, string, string] : [uniqueValue.value];
    }
    
    /**
     * - Naplnění atributů prvku {@link feature} tak, aby splňoval podmínky pro zobrazení symbologie z {@link uniqueValue}.
     * @param feature - Prvek, kterému měníne atributy.
     * @param uniqueValueRenderer - Renderer ze kterého je vzatá informace o renderování {@link uniqueValue}.
     * @param uniqueValue - Informace o konkrétním renderování v rámci rendereru {@link uniqueValueRenderer} ([Read more...](https://developers.arcgis.com/javascript/latest/api-reference/esri-renderers-UniqueValueRenderer.html#uniqueValueInfos)).
     */
    public static setUniqueRendererValues(feature: __esri.Graphic, uniqueValueRenderer: __esri.UniqueValueRenderer, uniqueValue: __esri.UniqueValueInfo) {
        const values = RendererHelper.getUniqueRendererValues(uniqueValueRenderer, uniqueValue);
        if (uniqueValueRenderer.field) {
            feature.setAttribute(uniqueValueRenderer.field, values[0]);
        }
        if (uniqueValueRenderer.field2) {
            feature.setAttribute(uniqueValueRenderer.field2, values[1]);
        }
        if (uniqueValueRenderer.field3) {
            feature.setAttribute(uniqueValueRenderer.field3, values[2]);
        }
    }
    
    /**
     * - Poskytuje informaci o konkrétním renderování v rámci {@link uniqueValueRenderer rendereru} na základě atributů {@link feature prvku}.
     * @param feature - Prvek, na podle jehož atributů hledáme informaci o renderování.
     * @param uniqueValueRenderer - Renderer v rámci kterého hledáme informaci o renderování.
     */
    public static getUniqueValueFromFeature(feature: __esri.Graphic, uniqueValueRenderer: __esri.UniqueValueRenderer): __esri.UniqueValueInfo {
        return uniqueValueRenderer.uniqueValueInfos.find(uniqueValue => {
            let values = RendererHelper.getUniqueRendererValues(uniqueValueRenderer, uniqueValue);
    
            if (uniqueValueRenderer.field && feature.getAttribute(uniqueValueRenderer.field) != values[0]) {
                return false
            }
            if (uniqueValueRenderer.field2 && feature.getAttribute(uniqueValueRenderer.field2) != values[1]) {
                return false
            }
            if (uniqueValueRenderer.field3 && feature.getAttribute(uniqueValueRenderer.field3) != values[2]) {
                return false
            }
            
            return true;
        });
    }
};