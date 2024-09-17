import { getSubLayerDefinitionFromFeature, equalsDefinition } from "../helpers/sublayerDefinition";
import { JimuMapView } from "jimu-arcgis";
import { DbRegistryLoader, RequestHelper, LayerHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys, EKnownLayerExtension } from "widgets/shared-code/enums";

/**
 * - Zrušení relační vazby mezi prvky {@link firstFeature} a {@link secondFeature}.
 * - Funkce vrací identifikátor relační vazby.
 * @param jimuMapView - View aktivní mapy.
 */
export default async function(jimuMapView: JimuMapView, firstFeature: __esri.Graphic, secondFeature: __esri.Graphic): Promise<string> {
    const [thisFeatureLayerDefinition, parentFeatureLayerDefinition, relationshipConfig] = await Promise.all([
        getSubLayerDefinitionFromFeature(jimuMapView, firstFeature),
        getSubLayerDefinitionFromFeature(jimuMapView, secondFeature),
        DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.RelationshipQueries, scope: "g", type: "json" })
    ]);

    const attributeRelationship = relationshipConfig.attributeRelationships.find(attributeRelationship => {
        return (equalsDefinition(attributeRelationship.destinationLayer, thisFeatureLayerDefinition) && equalsDefinition(attributeRelationship.originLayer, parentFeatureLayerDefinition)) || (equalsDefinition(attributeRelationship.destinationLayer, parentFeatureLayerDefinition) && equalsDefinition(attributeRelationship.originLayer, thisFeatureLayerDefinition));
    });

    const body: IDeleteAttributeRelationshipBody = {
        firstFeature: { attributes: firstFeature.attributes },
        firstLayer: thisFeatureLayerDefinition,
        relationshipClassId: attributeRelationship.id,
        secondFeature: { attributes: secondFeature.attributes },
        secondLayer: parentFeatureLayerDefinition
    };

    const stringifiedBody: { [K in keyof IDeleteAttributeRelationshipBody]: string } = {
        firstFeature: JSON.stringify(body.firstFeature),
        secondLayer: JSON.stringify(body.secondLayer),
        secondFeature: JSON.stringify(body.secondFeature),
        firstLayer: JSON.stringify(body.firstLayer),
        relationshipClassId: body.relationshipClassId
    };
    
    let mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, attributeRelationship.destinationLayer);
    const hasSoe = await LayerHelper.hasExtension(mapImageLayer, EKnownLayerExtension.RelationSoe);
    if (!hasSoe) {
        throw new Error(`Mapová služba '${mapImageLayer.title}' nemá napojenou potřebnou SOE '${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}'`);
    }

    await RequestHelper.jsonRequest<any>(`${mapImageLayer.url}/exts/${LayerHelper.getExtensionValue(EKnownLayerExtension.RelationSoe)}/Relationships/DeleteAttributeRelationship`, stringifiedBody);

    return attributeRelationship.id;
}

interface IDeleteAttributeRelationshipBody {
    /** - Jednoznačný technologický identifikátor relační třídy - definuje správce. */
    relationshipClassId: string;
    /** - Definice vrstvy ze které pochází prvek {@link firstFeature}. */
    firstLayer: HSI.ISublayerDefinition | HSI.ITableDefinition;
    /** - Definice vrstvy ze které pochází prvek {@link secondFeature}. */
    secondLayer: HSI.ITableDefinition | HSI.ISublayerDefinition;
    /** - Prvek pocházející z vrstvy {@link firstLayer}. */
    firstFeature: Pick<__esri.Graphic, 'attributes'>;
    /** - Prvek pocházející z vrstvy {@link secondLayer}. */
    secondFeature: Pick<__esri.Graphic, 'attributes'>;
};