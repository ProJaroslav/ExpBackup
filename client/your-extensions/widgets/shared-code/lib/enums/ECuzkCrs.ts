/**
 * - Názvy souřadnicových referenčních systémů, které služba ČÚZK používá k transformaci souřadnic mezi SRS S-JTSK, ETRS89 a WGS84.
 * - [Read more...](https://ags.cuzk.cz/arcgis2/rest/services/Transformacni/TransformaceSouradnic/GPServer/TransformaceSouradnic/)
 */
export enum ECuzkCrs {
    ETRS89DEG = "ETRS89 (BLh/DEG)",
    ETRS89DMS = "ETRS89 (BLh/DMS)",
    ETRS89Geocentric = "ETRS89 (XYZ/geocentric)",
    SJTSK = "S-JTSK + Bpv (YXH)",
    SJTSK05 = "S-JTSK/05 + Bpv (YXH)",
    ETRS89LAEA = "ETRS89-LAEA + EVRS (YXH)",
    ETRS89LCC = "ETRS89-LCC + EVRS (NEH)",
    ETRS89TM33EVRS = "ETRS89-TM33 + EVRS (NEH)",
    ETRS89TM34EVRS = "ETRS89-TM34 + EVRS (NEH)",
    ETRS89TM33GRS80 = "ETRS89-TM33 + GRS80 (NEH)",
    ETRS89TM34GRS80 = "ETRS89-TM34 + GRS80 (NEH)",
    WGS84DEG = "WGS84 (BLh/DEG)",
    WGS84DMS = "WGS84 (BLh/DMS)",
    WGS84Geocentric = "WGS84 (XYZ/geocentric)",
    WGS84UTM33 = "WGS84/UTM33 (ENh)",
    WGS84UTM34 = "WGS84/UTM34 (ENh)",
    WGS84PseudoMercator = "WGS84/Pseudo-Mercator (XYh)"
}

export default ECuzkCrs;