﻿export default class FromDataHelper {
    /**
     * Vráti zda má atribut ve formData přiřazenou akci
     * {@link fieldName} Název atributu pro který chceme akci najít
     */
    public static findActionInFromData(fieldName: string, fromData:HSI.DbRegistry.IFromDataDbValue, matchingLayer: HSI.SdMapServerSoe.ILayerInfo): HSI.DbRegistry.IFromDataAction {
        
        for (let i = 0; i < fromData.objectClasses.length; i++) {
            if (fromData.objectClasses[i].objectClass === matchingLayer.datasetName) {
                for (let x = 0; x < fromData.objectClasses[i].fields.length; x++) {
                    if (fromData.objectClasses[i].fields[x].name === fieldName && fromData.objectClasses[i].fields[x]?.action) {
                        return findActionByName(fromData.actions, fromData.objectClasses[i].fields[x]?.action);
                    }
                }
            }
            else {
                /**
                 * @todo - Hlásí hodně logů. Plus z funkce jde hodně výjimek.
                 * - Výjimky se musí ošetřit.
                 * - Do třídy doporučuji udělat statický objekt, který se bude napňovat výsledky, ať se neloopuje pořád dokola.
                 */
                console.log("Podvrstva v datasetu nebyla nalezena");
            }
        }
        function findActionByName(actions: any[], targetName: string) {
            for (let x = 0; x < actions.length; x++) {
                if (actions[x].action.name === targetName) {
                    return actions[x].action;
                }
            }
            return null;
        }
    }


    
    
    
    
}