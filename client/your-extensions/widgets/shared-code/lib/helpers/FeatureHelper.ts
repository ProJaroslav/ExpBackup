import { JimuMapView, LayerTypes } from "jimu-arcgis";
import { FormatNumberOptions } from "react-intl";
import { ArcGISJSAPIModuleLoader, DbRegistryLoader, GeometryTransformer, GeometryHelper, RequestHelper, GlobalSettingHelper, LayerHelper, LayerDefinitionHelper, DateHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { EConstants, EDbRegistryKeys, EFeatureType, EKnownLayerExtension } from "widgets/shared-code/enums";
import translations from "./translations/default";

export default class FeatureHelper {
    /**
     * - Získání hodnoty atributu z prvku.
     * - Včetně přeložení doménových hodnot a datumů.
     * @param feature - Prvek ze kterého hodnotu získáváme.
     * @param field - Informace o atributu.
     * @param options - Nastavení překladu hodnot.
     */
    public static getFeatureValue(feature: __esri.Graphic, field: __esri.Field, options: HSI.Feature.IFeatureValueOptions): string | number {
        let fieldName = field.name;
        if (!(fieldName in feature.attributes)) {
            fieldName = Object.keys(feature.attributes).find(fName => FeatureHelper.compareFieldName(fName, field));
        }
        const value = feature.getAttribute(fieldName);
        /** - Nastavení {@link field pole} v šabloně popupu. */
        let fieldInfo: __esri.FieldInfo;
    
        if (options.popupFormat) {
            fieldInfo = FeatureHelper.getPopupFieldInfo(feature, field, options.onLoad);
        }
        try {
            if (field.domain?.type === "coded-value") {
                return (field.domain as __esri.CodedValueDomain).codedValues.find(({ code }) => code == value)?.name || value;
            }
    
            switch(field.type) {
                case "date":
                    return DateHelper.formatIntTime(options.intl, value, { fieldFormat: fieldInfo?.format, onToolLoad: options.onLoad });
                default:
                    console.warn(`Unhandled field type "${field.type}"`)
                case "oid":
                case "double":
                case "integer":
                case "long":
                case "single":
                case "small-integer":
                    const intlOptions: FormatNumberOptions = {};
                    if (!!fieldInfo?.format) {
                        intlOptions.maximumFractionDigits = fieldInfo.format.places;
                        intlOptions.minimumFractionDigits = fieldInfo.format.places;
                        if (typeof fieldInfo.format.digitSeparator === "boolean") {
                            intlOptions.useGrouping = fieldInfo.format.digitSeparator;
                        }
                    }
                    return typeof value === "string" || typeof value === "number" ? options.intl.formatNumber(value as number, intlOptions) : null;
                case "geometry":
                case "global-id":
                case "guid":
                case "string":
                    return value;
            }
    
        } catch(err) {
            console.warn(err);
            return value;
        }
    }
    
    /**
     * - Zjišťuje zda je typ {@link field pole} číselný.
     * @param field - Pole.
     * @param excludeDomain - Chceme, aby pokud má {@link field pole} doménové hodnoty, typ nebyl považován za číselný?
     */
    public static isNumeralField(field: __esri.Field, excludeDomain: boolean = false): boolean {
        if (!!field.domain && excludeDomain) {
            return false;
        }
    
        switch(field.type) {
            case "oid":
            case "double":
            case "integer":
            case "long":
            case "single":
            case "small-integer":
                return true;
            default:
                return false;
        }
    }

    
    /**
     * - Změna geometrie prvku.
     * - Dojde k uložení na server.
     * @param feature - Prvek jehož geometrii checeme změnit.
     * @param geometry - Nová geometrie prvku.
     * @param rotattionInfo - Informace o nové rotaci symbologie.
     */
    public static async updateGeometry(jimuMapView: JimuMapView, feature: __esri.Graphic, geometry: __esri.Geometry, rotattionInfo?: HSI.IRotationInfo & HSI.Feature.IUpdateGeometryRotationInfoValue): Promise<void> {
        const [geometryInFeaturesSpatialReference, geometryEngine] = await Promise.all([
            new GeometryTransformer(geometry).clientProject(feature.geometry.spatialReference),
            ArcGISJSAPIModuleLoader.getModule("geometryEngineAsync")
        ]);
    
        let areEqual = await geometryEngine.equals(feature.geometry, geometryInFeaturesSpatialReference);
    
        const featureCopy = feature.clone();
        featureCopy.attributes = undefined;
        featureCopy.setAttribute(LayerHelper.getSublayerFromFeature(feature).objectIdField, feature.getObjectId());
    
        if (rotattionInfo?.rotationAttribute && feature.getAttribute(rotattionInfo.rotationAttribute) != rotattionInfo.currentValue) {
            featureCopy.setAttribute(rotattionInfo.rotationAttribute, rotattionInfo.currentValue);
            areEqual = false;
        }
    
        if (areEqual) {
            return;
        }
    
        featureCopy.geometry = geometryInFeaturesSpatialReference;
    
        await FeatureHelper.saveFeature(jimuMapView, featureCopy);
    
        feature.geometry = featureCopy.geometry;
        feature.attributes = featureCopy.attributes;
    
        LayerHelper.getSublayerFromFeature(feature).layer.refresh();
    }
    
    /**
     * - Změna hodnot atributů {@link features prvků}.
     * - Dojde k uložení na server.
     * - Před zeditováním se ověří zda je prvek a měněné editovatelný.
     * @param features - Prvky jejichž atributy checeme změnit. Všechny prvky musejí pocházet z jedné vrstvy!
     * @param attributes - Nové hodnoty atributů {@link features prvků}.
     */
    public static async updateAttributes(jimuMapView: JimuMapView, features: __esri.Graphic | Array<__esri.Graphic>, attributes: {[key: string]: string | number}): Promise<void> {
        if (!Array.isArray(features)) {
            return FeatureHelper.updateAttributes(jimuMapView, [features], attributes);
        }
    
        //#region - Validace editovatelnosti.
        const [layerDefinition, configuration] = await Promise.all([
            LayerDefinitionHelper.getLayerDefinitionFromFeature(jimuMapView, features[0]),
            DbRegistryLoader.fetchEditabilityDbRegistryValue(jimuMapView)
        ]);
        
        const serviceInfo = configuration?.layerInfos
            ?.find(layerInfo => LayerDefinitionHelper.matchMapImageLayerDefinition(layerDefinition, { mapName: layerInfo.mapName, mapServiceName: layerInfo.serviceLayer }));
    
        let layerInfo: typeof configuration['layerInfos'][number]['sublayerInfos'][number] | typeof configuration['layerInfos'][number]['tableInfos'][number];
        if (FeatureHelper.getFeatureType(features[0]) === EFeatureType.Sublayer) {
            let sublayer = LayerHelper.getSublayerFromFeature(features[0]);
            layerInfo = serviceInfo?.sublayerInfos?.find(sublayerInfo => sublayerInfo.sublayerId === sublayer.id);
        } else {
            let table = LayerHelper.getTableFromFeature(features[0]);
            layerInfo = serviceInfo?.tableInfos?.find(sublayerInfo => sublayerInfo.tableId === table.layerId);
        }
    
        /** - Editovatelné atributy. */
        const editableFields = layerInfo?.fieldInfos
            ?.filter(fieldInfo => {
                if (fieldInfo.isEditable === true) {
                    return true;
                }
                //Pokud nad atributem lze aplikovat "Attribute rules", tak chceme umožnit nastavit hodnotu na null (tím se aplikuje Attribute rules) i přesto že atribut není editovatelný.
                if (layerInfo.allowAttributeRules) {
                    let attributeRulesAttributes = Array.isArray(layerInfo.attributeRulesAttributes) ? layerInfo.attributeRulesAttributes : configuration.attributeRulesAttributes;
                    return Array.isArray(attributeRulesAttributes) && attributeRulesAttributes.includes(fieldInfo.fieldName) && attributes[fieldInfo.fieldName] === null;
                }
    
                return false;
            })
            ?.map(fieldInfo => fieldInfo.fieldName);
    
        if (!editableFields?.length || (features.length > 1 ? !layerInfo?.allowMassUpdate : !layerInfo?.allowUpdate)) {
            throw new Error(`Feature is not editable!`);
        }
    
        //#endregion
    
        let editableAttributes: typeof attributes = {};
    
        for (let attribute in attributes) {
            if (editableFields.includes(attribute)) {
                editableAttributes[attribute] = attributes[attribute];
            }
        }
    
        return FeatureHelper.updateAttributesDespiteEditability(jimuMapView, features, editableAttributes);
    }
    
    /**
     * - Změna hodnot atributů {@link features prvků}.
     * - Dojde k uložení na server.
     * - Nekontroluje se editovatelnost {@link features prvků} ani {@link attributes atributů}.
     * @param features - Prvky jejichž atributy checeme změnit. Všechny prvky musejí pocházet z jedné vrstvy!
     * @param attributes - Nové hodnoty atributů {@link features prvků}.
     */
    public static async updateAttributesDespiteEditability(jimuMapView: JimuMapView, features: __esri.Graphic | Array<__esri.Graphic>, attributes: {[key: string]: string | number}): Promise<void> {
        if (!Array.isArray(features)) {
            return FeatureHelper.updateAttributesDespiteEditability(jimuMapView, [features], attributes);
        }
    
        const featuresPairs: Array<{ originalFeature: __esri.Graphic; featureCopy: __esri.Graphic; }> = [];
    
        for (let originalFeature of features) {
            let featureCopy = originalFeature.clone();
            featureCopy.geometry = undefined; //Geometrii needitujeme
            featureCopy.attributes = undefined; //Odebereme všechny atributy a naplníme pouze ty, které chceme editovat + OBJECTID
    
            let hasChanged = false;
        
            for (let attributeName in attributes) {
                if (originalFeature.getAttribute(attributeName) !== attributes[attributeName]) {
                    featureCopy.setAttribute(attributeName, attributes[attributeName]);
                    hasChanged = true;
                }
            }
        
            featureCopy.setAttribute(LayerHelper.getSourceLayerFromFeature(originalFeature).objectIdField, originalFeature.getObjectId());
    
            if (!hasChanged) {
                continue;
            }
        
            featuresPairs.push({ featureCopy, originalFeature });
        }
    
        if (featuresPairs.length > 0) {
            await FeatureHelper.saveFeature(jimuMapView, featuresPairs.map(({ featureCopy }) => featureCopy));
        
            for (let { featureCopy, originalFeature } of featuresPairs) {
                for (let attributeName in featureCopy.attributes) {
                    originalFeature.setAttribute(attributeName, featureCopy.getAttribute(attributeName));
                }
            }
        }
    }
    
    /**
     * - Uložení změn {@link features prvků} na server a aktualizace jejich hodnot.
     * @param features - Prvky jejichž změny ukládáme. Všechny prvky musejí pocházet z jedné vrstvy!
     */
    public static async saveFeature(jimuMapView: JimuMapView, features: __esri.Graphic | Array<__esri.Graphic>): Promise<void> {
        if (!Array.isArray(features)) {
            return FeatureHelper.saveFeature(jimuMapView, [features]);
        }
    
        if (!features[0]) {
            throw new Error("Feature is not defined");
        }
        
        /** - Typ {@link features prvků}. */
        const featureType = FeatureHelper.getFeatureType(features[0]);
    
        /** - Zdrojová vrstva {@link features prvků}. */
        const layer = LayerHelper.getSourceLayerFromFeature(features[0]); 
    
        if (features.some(feature => LayerHelper.getSourceLayerFromFeature(feature) !== layer)) {
            throw new Error("Features do not originate from the same layer");
        }
    
        const hasFeatureAccess = await LayerHelper.hasExtension(LayerHelper.getMapImageLayerFromFeature(jimuMapView, features[0]), EKnownLayerExtension.FeatureServer);
    
        if (!hasFeatureAccess) {
            throw new Error(`Feature access is not supported for layer "${layer.title}".`);
        }
    
        /** - Feature vrstva, odpovídající {@link layer zdrojové vrstvě}, vytvořená přes FeatureServer. */
        const featureServerLayer = featureType === EFeatureType.Sublayer ? await LayerHelper.createFeatureLayer(layer as __esri.Sublayer) : await LayerHelper.duplicateTable(jimuMapView, layer as __esri.FeatureLayer);
    
        /**
         * - Kopie {@link prvků features}, s názvy atributů odpovídající FeatureServeru.
         * - Důvod je ten, že pokud je {@link layer vrstva} "joinovaná", tak se názvy atrtibutů z MapServer a FeatureServer liší. Např. SDEDO.PP_MERIDLO.C_UZEL a C_UZEL.
         */
        const featuresCopies = features.map(feature => {
            let copy = feature.clone();
            copy.attributes = undefined;
            for (let attribute in feature.attributes) {
                let featureField = featureServerLayer.fields.find(field => FeatureHelper.compareFieldName(field, attribute))
                if (!!featureField) {
                    copy.setAttribute(featureField.name, feature.getAttribute(attribute));
                }
            }
            
            copy.setAttribute(featureServerLayer.objectIdField, feature.getObjectId());
            FeatureHelper.setSourceLayer(copy, featureServerLayer);
            return copy; 
        });
    
        await featureServerLayer.applyEdits({ updateFeatures: featuresCopies });
    
        const featureSet = await layer.queryFeatures({
            objectIds: features.map(feature => feature.getObjectId()),
            outFields: ["*"],
            returnGeometry: true
        });
    
        for (let feature of features) {
            let updatedFeature = featureSet.features.find(f => f.getObjectId() === feature.getObjectId());
            feature.attributes = updatedFeature.attributes;
            if (featureType === EFeatureType.Sublayer) {
                feature.geometry = updatedFeature.geometry;
                (layer as __esri.Sublayer).layer.refresh();
            }
        }
    }
    
    /**
     * - Smazání prvků.
     * - Všechny prvky musí pocházet ze stejné zdrojové vrstvy!
     * @param features - Prvky, které chceme smazat.
     */
    public static async deleteFeatures(jimuMapView: JimuMapView, features: __esri.Graphic | Array<__esri.Graphic>): Promise<void> {
        if (!Array.isArray(features)) {
            return FeatureHelper.deleteFeatures(jimuMapView, [features]);
        }
    
        if (!features[0]) {
            throw new Error("Feature to be deleted is not defined");
        }
    
        const featureType = FeatureHelper.getFeatureType(features[0]);
        /** - Pomocná vrstva přes kterou se odstraňuje prvek. */
        let featureLayer: __esri.FeatureLayer;
        
        //#region - Načtení featureLayer
        switch(featureType) {
            case EFeatureType.Sublayer:
                const sublayer = LayerHelper.getSublayerFromFeature(features[0]);
                featureLayer = await LayerHelper.createFeatureLayer(sublayer);
                break;
            case EFeatureType.Table:
                const table = LayerHelper.getTableFromFeature(features[0]);
                if (LayerHelper.isServerLayer(table, "FeatureServer")) {
                    featureLayer = table;
                } else {
                    featureLayer = await LayerHelper.duplicateTable(jimuMapView, table);
                }
                break;
            default:
                throw new Error(`Unhandled feature type '${featureType}'`);
        }
        //#endregion
    
        /**
         * - Prvky přes které dochází k odstranění.
         * - Kopii vytváříme proto, že potřebujeme aby tento prvky měly pole shodná s {@link featureLayer Feature vrstvou} a nechceme měnit pole {@link feature původních prvků}.
         * - U joinovaných vrstev se liší názvy polí v MapSever a FeatureServer.
         */
        const featureCopes = features.map(feature => {
            let featureCopy = feature.clone();
            featureCopy.attributes = undefined;
            featureCopy.setAttribute(featureLayer.objectIdField, feature.getObjectId());
            return featureCopy;
        });
        await featureLayer.applyEdits({ deleteFeatures: featureCopes });
    
        //#region - Odebrání z výběru
        switch(featureType) {
            case EFeatureType.Sublayer:
                SelectionManager.getSelectionSet(jimuMapView).destroyFeature(features);
                LayerHelper.getSublayerFromFeature(features[0]).layer.refresh();
                break;
            case EFeatureType.Table:
                SelectionManager.getSelectionSet(jimuMapView).destroyTableFeature(features);
                break;
            default:
                throw new Error(`Unhandled feature type '${featureType}'`);
        }
        //#endregion
    }
    
    /**
     * - Vytvoření GisId grafického prvku.
     * @param feature - Prvek jehož GisId chceme vytvořit. 
     */
    public static getFeatureGisId(feature: __esri.Graphic): string {
        if (!feature)
            return null;
    
        const sublayer = LayerHelper.getSublayerFromFeature(feature);
        return `${sublayer.layer.id}.${sublayer.id}.${feature.getObjectId()}`;
    }
    
    /**
     * - Poskytuje typ prvku podle jeko zdrojoivé vrstvy.
     * @param feature - Prvek jehož typ chceme poskytnout.
     */
    public static getFeatureType(feature: __esri.Graphic): EFeatureType {
        const sourceLayer = feature['sourceLayer'] as __esri.Sublayer | __esri.FeatureLayer;

        if (sourceLayer.type === LayerTypes.FeatureLayer) {
            if (sourceLayer.isTable) {
                return EFeatureType.Table;
            }
        } else if (sourceLayer.type === "sublayer" && sourceLayer.layer.type === LayerTypes.MapImageLayer) {
            return EFeatureType.Sublayer;
        }
        
        console.warn(`Unsupported feature sourceLayer`, sourceLayer);
        throw new Error(`Unsupported feature sourceLayer`);
    }
    
    /**
     * - Vložení reference {@link sourceLayer zdrojové vrstvy} do {@link feature prvku}.
     * - Tato funkce by se měla používat pouze pokud dochází k vytvoření nového prvku (nebo pokud z jiného důvodu {@link feature prvek} nemá vyplněný parametr 'sourceLayer'), při vyhledání prvku přes {@link sourceLayer.queryFeatures} automaticky dochází k vložení reference zdrojové vrstvy. 
     * @param feature - Prvek pocházející z {@link sourceLayer vrstvy}
     * @param sourceLayer - Vrstva ze které pochází {@link feature prvek}.
     */
    public static setSourceLayer(feature: __esri.Graphic, sourceLayer: __esri.Sublayer | __esri.FeatureLayer): void {
        feature['sourceLayer'] = sourceLayer;
    }
    
    /**
     * - Vytvoření GisId prvku nehledě na jeho typ.
     * @param feature - Prvek jehož GisId chceme vytvořit.
     */
    public static provideFeatureGisId(feature: __esri.Graphic): string {
        switch(FeatureHelper.getFeatureType(feature)) {
            case EFeatureType.Sublayer:
                return FeatureHelper.getFeatureGisId(feature);
            case EFeatureType.Table:
                return FeatureHelper.getTableFeatureGisId(feature);
            default:
                console.warn("Unhandled feature type");
        }
    }
    
    /**
     * - Poskytuje ObjectId (primární klíč v rámci DB tabulky) prvku podle jeho GisId.
     * @param gisId - GisId prvku.
     */
    public static getObjectIdFromGisId(gisId: string): string {
        return gisId.split(".")[2];
    }
    
    /**
     * - Vytvoření GisId negrafického prvku (z tabulky).
     * @param feature - Prvek jehož GisId chceme vytvořit. 
     */
    public static getTableFeatureGisId(feature: __esri.Graphic): string {
        if (!feature)
            return null;
    
        const table = LayerHelper.getTableFromFeature(feature);
        return `${table.id}.${feature.getObjectId()}`;
    }
    
    /**
     * - Vytvoření featureSetu.
     * @param layer - Vrstva ze které prvky pochází.
     * @param features - Atributy a geometrie prvků.
     * @param spatialReference - Souřadnicový systém geometrií prvků.
     */
    public static async createFeaturesFromJson(layer: __esri.Sublayer | __esri.FeatureLayer, features: Array<HSI.IFeatureJson> = [], spatialReference: __esri.SpatialReference): Promise<__esri.FeatureSet> {
        if (layer.loadStatus !== "loaded") {
            await layer.load();
        }
    
        const FeatureSet = await ArcGISJSAPIModuleLoader.getModule("FeatureSet");
    
        const featureSet = FeatureSet.fromJSON({
            fields: layer.fields,
            displayFieldName: layer.sourceJSON.displayField,
            features: features.map(feature => {
                let featureJson = {
                    attributes: feature.attributes,
                    sourceLayer: layer
                }
    
                for (let field of layer.fields) {
                    if (field.type === "date" && typeof feature.attributes?.[field.name] === "string") {
                        feature.attributes[field.name] = new Date(feature.attributes[field.name]).getTime();
                    }
                }
                
                if (feature.geometry) {
                    featureJson['geometry'] = {
                        ...feature.geometry,
                        spatialReference
                    }
                }
    
                return featureJson;
            })
        });
        
        featureSet.geometryType = featureSet.features[0]?.geometry?.type;
        featureSet.spatialReference = spatialReference;
    
        return featureSet;
    }
    
    /**
     * - Zobrazení hodnoty prvku.
     * @param feature - Prvek, který chceme zobrazit.
     * @param options - Parametry.
     */
    public static displayFeature(feature: __esri.Graphic, options: HSI.Feature.IDisplayFeatureOptions): string {
        try {
            let displayField = options?.displayField || options?.featureSet?.displayFieldName;
            let fields = options?.featureSet?.fields;
            const featureType = FeatureHelper.getFeatureType(feature);
            const style: typeof options['style'] = typeof options?.style === "string" ? options.style : "{diplayField} ({OID})";
            
            let layer: __esri.Sublayer | __esri.FeatureLayer;
            switch(featureType) {
                case EFeatureType.Sublayer:
                    layer = LayerHelper.getSublayerFromFeature(feature);
                    if (!displayField) {
                        displayField = LayerHelper.getDisplayFieldSinc(layer);
                    }
    
                    break;
                case EFeatureType.Table:
                    layer = LayerHelper.getTableFromFeature(feature);
                    if (!displayField) {
                        displayField = layer.displayField;
                    }
    
                    break;
                default:
                    throw new Error(`Unhandled feature type '${featureType}'`);
            }
            
            if (!Array.isArray(fields)) {
                fields = layer.fields;
            }
    
            if (layer.loadStatus === "not-loaded") {
                layer.load();
            }
        
            let filed: __esri.Field;
            
            if (displayField && Array.isArray(fields)) {
                filed = fields.find(field => FeatureHelper.compareFieldName(field, displayField));
            }
    
            let displayFieldValue = filed ? FeatureHelper.getFeatureValue(feature, filed, { intl: options.intl }) : feature.getAttribute(displayField);
    
            switch(style) {
                case "{diplayField} ({OID})":
                case "{layerTitle} - {diplayField} - {OID}":
                    return style
                        .replace("{layerTitle}", layer.title)
                        .replace("{diplayField}", !displayFieldValue && displayFieldValue !== 0 ? "" : displayFieldValue)
                        .replace("{OID}", feature.getObjectId().toString());
    
                case "{diplayField}|{OID}":
                case "{layerTitle} - {diplayField}|{OID}":
                    if (!displayFieldValue && displayFieldValue !== 0) {
                        displayFieldValue = feature.getObjectId();
                    }
    
                    return style
                        .replace("{layerTitle}", layer.title)
                        .replace("{diplayField}|{OID}", !displayFieldValue && displayFieldValue !== 0 ? "" : displayFieldValue)
                default:
                    console.warn(`Unhandled format: ${style}`);
                    return feature.getObjectId().toString();
            }
        } catch(err) {
            console.warn(err);
            return "";
        }
    }
    
    /**
     * - Pokytuje URL aplikace, s parametry pro vyhledání prvku {@link feature}.
     * @param jimuMapView - Aktivní view mapy.
     * @param feature - Prvek, který chceme vyhledat.
     * @param useRedirector - Má se (pokud je v konfiguraci) odkaz generovat na {@link EDbRegistryKeys.RedirectAppUrl "Redirector" aplikaci}?
     */
    public static async generateLink(jimuMapView: JimuMapView, feature: __esri.Graphic, useRedirector: boolean = true): Promise<string> {
        /** - Vyhledávací parametry. */
        let partialSerachParams: Pick<HSI.Feature.ISelectUrlQuery, "layerId" | "mapServiceName">;
        /** - Zdrojová vrstva {@link feature prvku}. */
        let sourceLayer: __esri.Sublayer | __esri.FeatureLayer;
    
        if (FeatureHelper.getFeatureType(feature) === EFeatureType.Sublayer) {
            sourceLayer = LayerHelper.getSublayerFromFeature(feature);
    
            partialSerachParams = { layerId: sourceLayer.id };
    
            if (GlobalSettingHelper.get("tokenMapServiceName")) {
                partialSerachParams.mapServiceName = LayerHelper.getServiceName(sourceLayer.layer as __esri.MapImageLayer);
            }
            
        } else {
            sourceLayer = LayerHelper.getTableFromFeature(feature);
    
            partialSerachParams = { layerId: sourceLayer.layerId };
    
            if (GlobalSettingHelper.get("tokenMapServiceName")) {
                partialSerachParams.mapServiceName = LayerHelper.getServiceName(LayerHelper.getMapImageLayerFromTable(jimuMapView, sourceLayer));
            }
        }
    
        if (sourceLayer.loadStatus !== "loaded") {
            await sourceLayer.load();
        }
    
        /** - Název pole s identifikátorem prvku. */
        const objectIdField = sourceLayer.objectIdField;
        /** - Pole načtené ze zdrojové vrstvy prvku. */
        const fields = sourceLayer.fields;
        /** - Parametry vyhledávání. */
        let serachParams: HSI.Feature.ISelectUrlQuery;
        
        /** - Název atributu, ve kterém je uložen identifikátor prvku. */
        let idFieldName: string;
        /** - URL adresa aplikace, která se používá při generování odkazu na prvek. */
        let redirectAppUrl: string;
    
        const promisses = [
            DbRegistryLoader
                .fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.SelectFeatureIdAttribute, scope: "g", type: "string" })
                .then(ifn => {
                    idFieldName = ifn;           
                })
        ];
    
        if (useRedirector) {
            promisses.push(
                DbRegistryLoader
                    .fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RedirectAppUrl, scope: "g", type: "string" })
                    .then(rau => {
                        redirectAppUrl = rau;
                    })
            );
        }
        
        await Promise.all(promisses);
        /** - Pole, ve kterém je uložen identifikátor prvku. */
        let idField: __esri.Field;
    
        if (!!idFieldName && Array.isArray(fields)) {
            idField = fields.find(field => FeatureHelper.compareFieldName(field, idFieldName));
        }
    
        if (!!idField) {
            let featureId = feature.getAttribute(idField.name);
    
            if (featureId === null || featureId === undefined) { // featureId by měl být unikátní identifikátor, tudíž by vždy měl existovat. Pokud neexistuje, tak předpokládáme, že feature neobsahuje všechny atributy. To se může stát např. v pop-upu.
                featureId = (await sourceLayer.queryFeatures({
                    objectIds: [feature.getObjectId()],
                    outFields: [idField.name],
                    num: 1
                })).features[0].getAttribute(idField.name);
            }
    
            serachParams = {
                ...partialSerachParams,
                featureId
            };
        } else {
            serachParams = {
                ...partialSerachParams,
                where: `${objectIdField}=${feature.getObjectId()}`
            }
        }
    
        /** - URL této aplikace. */
        const url = new URL(location.toString());
        /** - URL aplikace na kterou se proklikáváme. */
        let appUrl: URL;
    
        if (typeof redirectAppUrl === "string" && redirectAppUrl.trim().length > 0) {
            serachParams.appUrl = url.pathname;
            appUrl = new URL(redirectAppUrl);
        } else {
            appUrl = url;
        }
    
        appUrl.searchParams.set(EConstants.selectUrl, JSON.stringify(serachParams));
    
        return appUrl.toString();
    }
    
    /**
     * - Poskytuje nastavení vrstvy, ve které se hledá pomocná geometrie pro {@link feature negrafický prvek}.
     * @param jimuMapView - Aktivní view mapy. 
     * @param feature - Negrafický prvek, ke kterému nastavení. 
     */
    private static async findGeometryProvider(jimuMapView: JimuMapView, feature: __esri.Graphic): Promise<HSI.IGeometryProvider> {
        if (FeatureHelper.getFeatureType(feature) !== EFeatureType.Table) {
            throw new Error("Unsupported feature type");
        }
    
        const config = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.GeometryProvider, scope: "g", type: "json" });
    
        for (let geometryProviderConfiguration of (config?.geometryProviders || [])) {
            if ((await LayerDefinitionHelper.findTablesByDefinition(jimuMapView, geometryProviderConfiguration.table)) === LayerHelper.getTableFromFeature(feature)) {
                return geometryProviderConfiguration;
            }
        }
    }
    
    /**
     * - Vytvoření where klausule pro vyhledání pomocné geometrie pro {@link features negrafické prvky}.
     * @param sublayer - Podvrstva, ve které se vyhledává pomocná geometrie.
     * @param geometryProvider - Konfigurace vyhledávání pomocné geometrie v {@link sublayer podvrstvě}.
     * @param features - Prvky, pro ketré se vyhledává pomocná geometrie.
     */
    private static async constructGeometryProviderWhereClause(sublayer: __esri.Sublayer, geometryProvider: Pick<HSI.IGeometryProvider, "tableAttribute" | "geometryProviderAttribute" | "table">, features: __esri.Graphic | Array<__esri.Graphic>): Promise<string> {
        if (!geometryProvider || !sublayer || !features) {
            return;
        }
    
        if (!Array.isArray(features)) {
            return FeatureHelper.constructGeometryProviderWhereClause(sublayer, geometryProvider, [features]);
        }
    
        if (sublayer.loadStatus !== "loaded") {
            await sublayer.load();
        }
    
        const { tableAttribute, geometryProviderAttribute } = geometryProvider;
    
        if (Array.isArray(geometryProviderAttribute) && Array.isArray(tableAttribute)) {
            return geometryProviderAttribute
                .map((attribute, index) =>
                FeatureHelper.getEqualCondition(
                        attribute,
                        sublayer.fields,
                        features.reduce<Array<any>>((values, feature) => {
                            let value = feature.getAttribute(tableAttribute[index])
                            if (values.includes(value)) {
                                return values;
                            }
                            return values.concat(value);
                        }, [])))
                .filter(condition => !!condition)
                .join(" AND ");
        } else if (typeof geometryProviderAttribute === "string" && typeof tableAttribute === "string") {
            return FeatureHelper.getEqualCondition(geometryProviderAttribute, sublayer.fields, features.map(feature => feature.getAttribute(tableAttribute)));
        } else {
            throw new Error(`Serach geaometry parameters for table '${geometryProvider.table.layerId}' are incorrect`);
        }
    }
    
    /**
     * - Nalezení prvků poskytujicích geometrii pro negrafický prvek {@link feature}.
     * @param jimuMapView - Aktivní view mapy.
     * @param feature - Negrafický prvek, ke kterému hledáme grafické prvky.
     * @param params - Parametry vyhledávání.
     * @param signal - Signalizace přerušení dotazu.
     */
    public static async queryGeometryFeatures(jimuMapView: JimuMapView, feature: __esri.Graphic, params: Omit<__esri.QueryProperties, "where"> = { outFields: ["*"], returnGeometry: true }, signal?: AbortSignal): Promise<__esri.FeatureSet | undefined> {
        const geometryProvider = await FeatureHelper.findGeometryProvider(jimuMapView, feature);
                                
        if (!geometryProvider) {
            return;
        }
    
        const [sublayer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, geometryProvider.searchGeometryLayer);
    
        const where = await FeatureHelper.constructGeometryProviderWhereClause(sublayer, geometryProvider, feature);
    
        if (!where) {
            return null;
        }
    
        const featureSet = await sublayer.queryFeatures({
            ...params,
            where
        });
    
        return featureSet;
    }
    
    public static async zoomToTableFeatures(jimuMapView: JimuMapView, features: __esri.Graphic | Array<__esri.Graphic>): Promise<void> {
        if (!Array.isArray(features)) {
            return FeatureHelper.zoomToTableFeatures(jimuMapView, [features]);
        }
    
        if (features.length < 1) {
            return;
        }
    
        const geometryProvider = await FeatureHelper.findGeometryProvider(jimuMapView, features[0]);
    
        if (!geometryProvider) {
            return;
        }
    
        const [sublayer] = await LayerDefinitionHelper.findSublayersByDefinition(jimuMapView, geometryProvider.searchGeometryLayer);
    
        const where = await FeatureHelper.constructGeometryProviderWhereClause(sublayer, geometryProvider, features);
    
        if (!where) {
            return;
        }
    
        const featureLayer = await LayerHelper.createFeatureLayer(sublayer);
    
        const response = await featureLayer.queryExtent({
            where,
            outSpatialReference: jimuMapView.view.spatialReference
        }) as { count: number; extent: __esri.Extent; };
    
        if (!!response?.extent) {
            await GeometryHelper.zoom(jimuMapView, [response.extent]);
        }
    }
    
    /**
     * - Pokytuje where klauzuli, pro {@link fieldName} rovnajicí se {@link value}.
     * @param fieldName - Název pole podle kterého se vyhledává.
     * @param fields - Kolekce polí z vrstvy ve které se vyhledává, obsahující pole {@link fieldName}.
     * @param value - Hodnota, která se vyhledává.
     */
    public static getEqualCondition(fieldName: string, fields: Array<__esri.Field>, value: string | number | Array<string | number>): string | null {
        if (value === null || (Array.isArray(value) && value.length < 1)) {
            return `${fieldName} IS NULL`;
        }
    
        let stringWhere: string;
        
        try {
            stringWhere = `UPPER(${fieldName}) LIKE '${value?.toString()?.toUpperCase() || ""}'`;
            if (Array.isArray(value)) {
                if (value.length === 1) {
                    return FeatureHelper.getEqualCondition(fieldName, fields, value[0]);
                } else {
                    return `UPPER(${fieldName}) IN (${value.join(",")})`;
                }
            }
            let field = fields.find(field => FeatureHelper.compareFieldName(field, fieldName));
            switch(field.type) {
                case "oid":
                case "small-integer":
                case "long":
                case "integer":
                case "single":
                case "double":
                    if (!isNaN(value as any)) {
                        return `${fieldName}=${value}`;
                    }
    
                    return null;
                default:
                    console.warn(`Unhandled field type '${field.type}'`);
                case "string":
                    return stringWhere;
            }
        } catch(err) {
            console.warn(err);
            return stringWhere;
        }
    }
    
    /**
     * - Ověření zda originální geometrie prvku obsahuje křivky.
     * @param feature - Prvek u kterého ověřujeme křivky.
     * @param signal - Signalizace zrušení dotazu.
     */
    public static async hasCurves(feature: __esri.Graphic, signal?: AbortSignal): Promise<boolean> {
        /** - Url vrstvy. */
        let layerUrl: string;
        const type = FeatureHelper.getFeatureType(feature);
        switch (type) {
            case EFeatureType.Sublayer:
                layerUrl = LayerHelper.getSublayerFromFeature(feature).url;
                break;
            case EFeatureType.Table:
                // Negrafická vrstva nemá geometrii, tudíž ani křivky.
                return false;
            default:
                throw new Error(`Unhandled feature type '${type}'`);
        }
    
        // Křivku mohou maít pouze polygony a linie.
        if (feature.geometry.type !== "polygon" && feature.geometry.type !== "polyline") {
            return false;
        }
    
        const response = await RequestHelper.jsonRequest<{ features: [{ geometry: { [key in "rings" | "paths" | "curveRings" | "curvePaths"]: any } }] }>(`${layerUrl}/query`, {
            objectIds: feature.getObjectId(),
            returnGeometry: true,
            returnTrueCurves: true
        }, signal);
    
        const geometryJson = response?.features?.[0]?.geometry;
    
        if (geometryJson) {
            return geometryJson?.curvePaths || geometryJson?.curveRings;
        }
    
        return false;
    }
    
    
    /**
     * - Detekce změny {@link attributeName atributu} v {@link feature prvku}.
     * - Není to vůbec ideální řešení, ale na nic lepšího jsem nepřišel. Zkoušel jsem nástroje {@link __esri.watchUtils watchUtils} i {@link __esri.reactiveUtils reactiveUtils} (zkoušeno v ExB v1.8).
     * @param feature - Prvek, jehož změny odchytáváme.
     * @param attributeName - Název atributu, jehož změny odchytáváme.
     * @param callback - Funkce, která se zavolá při změně {@link attributeName atributu}.
     */
    public static watchAttributeChange<T extends string | Array<string>, V extends (T extends string ? any : Array<any>)>(feature: __esri.Graphic, attributeName: T, callback: (newValues: V, oldValues: V) => void): __esri.WatchHandle {
        const hasAttributeSetterBeenUpdatedKey = "hasAttributeSetterBeenUpdated";
    
        if (!feature.get(hasAttributeSetterBeenUpdatedKey)) {
            const originalSetAttribute = feature.setAttribute.bind(feature);
            feature.setAttribute = (...args) => {
                originalSetAttribute(...args);
                feature.attributes = {...feature.attributes};
            }
            feature.set(hasAttributeSetterBeenUpdatedKey, true);
        }
        
        if (Array.isArray(attributeName)) {
            let lastValues = attributeName.map(attribute => feature.getAttribute(attribute)) as V;
        
            return feature.watch("attributes", newAttributes => {
                
                if (attributeName.some((attribute, index) => newAttributes[attribute] !== lastValues[index])) {
                    let newValues = attributeName.map(attribute => newAttributes[attribute]) as V;
                    callback(newValues, lastValues);
                    lastValues = newValues;
                }
            });
            
        }
        let lastValue = feature.getAttribute(attributeName);
    
        return feature.watch("attributes", newAttributes => {
            if (newAttributes[attributeName] !== lastValue) {
                callback(newAttributes[attributeName], lastValue);
                lastValue = newAttributes[attributeName];
            }
        });
    }
    
    /**
     * - Porovnání názvů polí/atributů.
     * - Funkce byla vytvořena především kvůli porovnání názvů polí geometre. Např. název "SHAPE.AREA" je v JS API reprezentován jako "Shape__Area". Jedná se však o stejné pole.
     * - Funkce také vrátí "true" pokud se názvy neshodují, ale jeden z názvů obsohuje tečku, a jeho část za poslední tečkou je shodná druhému názvu. To je z toho důvodu, že pokud se "joinovaná" vrtsva načte přes MapServer, tak obsahuje název včetně názvu tabulky (např. SDEDO.PP_MERIDLO.C_UZEL), ale pokud se načte přes FeatureSever, tak obsahuje pouze název sloupce (např. C_UZEL).
     * - V budoucnu by se funkce mohla rozšířit o ignorování velkých/malých písmen, či o jiné překlepy, které mohou nastat při ručním psaní konfigurace.
     * @param first - První pole (nebo jeho název) k porovnání.
     * @param second - Druhé pole (nebo jeho název) k porovnání. 
     */
    public static compareFieldName(first: __esri.Field | string, second: __esri.Field | string): boolean {
        if (typeof first !== "string") {
            first = first?.name || "";
        }
        if (typeof second !== "string") {
            second = second?.name || "";
        }
    
        if (!first || !second) {
            return false;
        }
    
        if (first === second) {
            return true;
        }
    
        const both = [first, second];
    
        if ((both.includes("Shape__Area") && both.includes("SHAPE.AREA")) || (both.includes("Shape__Length")&& both.includes("SHAPE.LEN"))) {
            return true;
        }
    
        if (both.some(fieldName => fieldName.includes(".")) && both.some(fieldName => !fieldName.includes("."))) {
            return FeatureHelper.compareFieldName(first.split(".").reverse()[0], second.split(".").reverse()[0]);
        }
    
        return false;
    }
    
    /**
     * - Poskytuje název {@link field pole} podle nastavení v šabloně popupu.
     * @param feature - Vrstva nebo prvek obsahující {@link field pole}.
     * @param field - Pole pro které nacházíme nastavení.
     * @param onMetadataLoad - Funkce, která se volá při načtení metadat.
     */
    public static popupAlias(feature: __esri.Graphic | __esri.Sublayer | __esri.FeatureLayer, field: __esri.Field, onMetadataLoad?: () => void): string {
        return FeatureHelper.getPopupFieldInfo(feature, field, onMetadataLoad)?.label || field.alias;
    }
    
    /**
     * - Nachází nastavení {@link field pole} v šabloně popupu.
     * @param feature - Prvek obsahující {@link field pole}.
     * @param field - Pole pro které nacházíme nastavení.
     * @param onMetadataLoad - Funkce, která se volá při načtení metadat.
     */
    public static getPopupFieldInfo(feature: __esri.Graphic, field: __esri.Field, onMetadataLoad?: () => void): __esri.FieldInfo;
    /**
     * - Nachází nastavení {@link field pole} v šabloně popupu.
     * @param feature - Vrstva obsahující {@link field pole}.
     * @param field - Pole pro které nacházíme nastavení.
     * @param onMetadataLoad - Funkce, která se volá při načtení metadat.
     */
    public static getPopupFieldInfo(sourceLayer: __esri.Sublayer | __esri.FeatureLayer, field: __esri.Field, onMetadataLoad?: () => void): __esri.FieldInfo;
    /**
     * - Nachází nastavení {@link field pole} v šabloně popupu.
     * @param sourceLayer - Vrstva nebo prvek obsahující {@link field pole}.
     * @param field - Pole pro které nacházíme nastavení.
     * @param onMetadataLoad - Funkce, která se volá při načtení metadat.
     */
    public static getPopupFieldInfo(sourceLayer: __esri.Graphic | __esri.Sublayer | __esri.FeatureLayer, field: __esri.Field, onMetadataLoad?: () => void): __esri.FieldInfo;
    public static getPopupFieldInfo(sourceLayer: __esri.Graphic | __esri.Sublayer | __esri.FeatureLayer, field: __esri.Field, onMetadataLoad?: () => void): __esri.FieldInfo {
        if (!sourceLayer) {
            throw new Error("sourceLayer is not defined!");
        }
        if (!("loadStatus" in sourceLayer)) { //Pokud nemá vlastnost "loadStatus", tak předpokládám že je to prvek.
            return FeatureHelper.getPopupFieldInfo(LayerHelper.getSourceLayerFromFeature(sourceLayer, true), field, onMetadataLoad);
        }
    
        if (sourceLayer.loadStatus !== "loaded") {
            sourceLayer
                .load()
                .then(onMetadataLoad);
            
        } else if (Array.isArray(sourceLayer.popupTemplate?.fieldInfos)) {
            return sourceLayer.popupTemplate.fieldInfos.find(fieldInfo => FeatureHelper.compareFieldName(fieldInfo.fieldName, field));
        }
    }

    /**
     * - Odstranění prvků v {@link tableName tabulce} podle {@link featureIds jejich ID}.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param tableName - Název tabulky ve které chceme smazat {@link featureIds prvky}.
     * @param featureIds - ID prvků které chceme smazat.
     */
    public static async deleteFeatureInTable(jimuMapView: JimuMapView, tableName: string, featureIds: Array<number>): Promise<void>;
    /**
     * - Odstranění prvku v {@link tableName tabulce} podle {@link featureId jeho ID}.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param tableName - Název tabulky ve které chceme smazat {@link featureId prvek}.
     * @param featureIds - ID prvku který chceme smazat.
     */
    public static async deleteFeatureInTable(jimuMapView: JimuMapView, tableName: string, featureId: number): Promise<void>;
    /**
     * - Odstranění prvků v {@link tableName tabulce} podle {@link featureIds jejich ID}.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param tableName - Název tabulky ve které chceme smazat {@link featureIds prvky}.
     * @param featureIds - ID prvků které chceme smazat.
     */
    public static async deleteFeatureInTable(jimuMapView: JimuMapView, tableName: string, featureIds: Array<number> | number): Promise<void> {
        if (!Array.isArray(featureIds)) {
            return FeatureHelper.deleteFeatureInTable(jimuMapView, tableName, typeof featureIds === "number" ? [featureIds] : []);
        }

        return FeatureHelper.applyEditsInTable(jimuMapView, { deletes: featureIds.map(objectId => ({ objectId, table: tableName })) });
    }

    /**
     * - Editace prvků v tabulce přes SOE.
     * @param jimuMapView - Aktivní pohled mapy.
     * @param edits - Změny v prvcích.
     */
    public static async applyEditsInTable(jimuMapView: JimuMapView, edits: HSI.Feature.IApplyEditsSoeBody): Promise<void> {
        const layers = await LayerHelper.findAllMapImageLayersWithExtensions(jimuMapView, EKnownLayerExtension.SdSoe);

        if (layers.length < 1) {
            throw new Error(translations.noSdSoeError.replace("{0}", LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)));
        }

        await RequestHelper.jsonRequest(`${layers[0].url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.SdSoe)}/ApplyEdits`, {
            edits: JSON.stringify(edits)
        });
    }
};