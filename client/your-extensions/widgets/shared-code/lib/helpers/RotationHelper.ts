export default class RotationHelper {
    /**
     * - Regulární výraz pro vyčtění rotačního atributu a odchylky rotace z Arcade výrazu.
     * - V nalezeném výsledném poli nás zajímají 3 položky: 4 - Rotační atribut, 7 - Znaménko odchylky rotace, 8 - Hodnota odchylky rotace
     * @example
     * "$feature.ORIENTATION-180"
     * "$feature.ORIENTATION - 180"
     * "$feature['SDEDO.PP_DVERE.ORIENTATION'] - 180"
     * "$feature['SDEDO.PP_DVERE.ORIENTATION']"
     * "$feature.SDEDO.PP_DVERE.ORIENTATION"
     */
    private static rotationExpression = new RegExp(/^\$feature((\[\')|(\.))([^\s\'\]\+\-]+)(\'\])?\s?(([\+\-])\s?([0-9]+)|[\s\S]+)?/, "i");

    /**
     * - Přepočet aritmetické rotace na rotaci geografickou.
     * @param rotation - Aritmetická rotace.
     */
    public static arithmeticToGeographic(rotation: number): number {
        if (rotation < 90) {
            return 90 - rotation;
        } else if (rotation < 180) {
            return rotation + ((180 - rotation) * 2) - 270;
        } else if (rotation < 270) {
            return 180 + 270 - rotation ;
        } else {
            return 270 - (rotation - 270) - 90;
        }
    }
    
    /**
     * - Přepočet geografické rotace na rotaci aritmetickou.
     * @param rotation - Geografická rotace.
     */
    public static geographicArithmeticTo(rotation: number): number {
        if (rotation < 90) {
            return 90 - rotation;
        } else if (rotation < 180) {
            return 180 + (180 - rotation) + 90;
        } else if (rotation < 270) {
            return 180 + 270 - rotation;
        } else {
            return rotation + ((360 - rotation) * 2) - 270;
        }
    }
    
    /**
     * - Nachází název atributu podle kterého se určuje rotace prvku a typ jeho rotace.
     * @param renderer - Způsob vykreslování geometrie podvrstvy.
     */
    public static getRotationAttributeName(renderer: __esri.UniqueValueRenderer | __esri.SimpleRenderer, fields?: Array<__esri.Field>): HSI.IRotationInfo {
        if (renderer.visualVariables?.length > 0) {
            for (let visualVariable of renderer.visualVariables) {
                if (visualVariable.type === "rotation") {
                    let rotationVariable = visualVariable as __esri.RotationVariable;
                    if (rotationVariable.field) {
                        return {
                            rotationAttribute: rotationVariable.field,
                            rotationType: rotationVariable.rotationType,
                            rotationDifference: 0
                        };
                    } else if (rotationVariable.valueExpression && RotationHelper.rotationExpression.test(rotationVariable.valueExpression)) {
                        const match = rotationVariable.valueExpression.match(RotationHelper.rotationExpression);
                        const rotationDifference = !!match[8] ? parseInt(match[8]) || 0 : 0
                        return {
                            rotationAttribute: match[4],
                            rotationType: rotationVariable.rotationType,
                            rotationDifference: !!rotationDifference ? (match[7] === "-" ? -rotationDifference : rotationDifference) : 0
                        }
                    }
                }
            }
        }
    }
};
