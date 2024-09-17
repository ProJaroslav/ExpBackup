/** - Typy geometrie podle kterých lze provést výběr. */
export enum EGeometryType {
    /** - Výběr bodem. */
    Point = "point",
    /** - Výběr obdelníkem. */
    Rectangle = "rectangle",
    /** - Výběr polygonem. */
    Polygon = "polygon"
};

export default EGeometryType;